import fs from "fs/promises";
import path from "path";

import { parseHTML } from "linkedom";

import { map_concurrent } from "#lib/concurrency.js";
import { DAYS_SHOWN } from "#lib/constants.js";
import { fetch_text } from "#lib/http.js";
import { refresh_posters } from "#lib/posters.js";
import { load_movie_details } from "#lib/movie-details-cache.js";
import { reykjavik_date } from "#lib/reykjavik.js";
import type { Movie } from "#lib/schemas.js";
import {
  assemble_movie,
  parse_movie_details,
  parse_listings,
  fetch_external_urls,
  scrape_rotten_tomatoes,
  scrape_metacritic,
  scrape_letterboxd,
  prefetch_imdb_ratings,
  type ExternalUrls,
  type ImdbRating,
} from "#lib/parse.js";

const staticDirectory = path.resolve(process.cwd(), "static");
// Scraper state restored between CI runs; kept out of static/ so it is not deployed.
const cacheDirectory = path.resolve(process.cwd(), ".cache");

const headers = {
  authority: "kvikmyndir.is/",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,la;q=0.7",
  "cache-control": "max-age=3600",
  "sec-ch-ua": '"Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
} as const;

// Requests in flight per host. Enough to overlap network latency without
// hammering the small sites we scrape.
const CONCURRENCY = 4;

// Movie pages are slow to generate and rarely change; refresh them daily.
const MOVIE_DETAILS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function fetch_movie_details(id: number) {
  try {
    return parse_movie_details(parseHTML(await fetch_text(`https://kvikmyndir.is/mynd/?id=${id}`, { headers })).document, id);
  } catch (error) {
    console.error(`Failed to fetch/parse movie ID ${id}:`, error);
    return null;
  }
}

const imdb_id = (movie: Movie) => movie.imdb?.link.match(/tt\d+/)?.[0];

// Attach IMDb, Rotten Tomatoes, Metacritic and Letterboxd scores. The three
// sites are scraped at once; kvikmyndir.is scores remain as the fallback.
async function with_ratings(
  movie: Movie,
  imdbRatings: ReadonlyMap<string, ImdbRating>,
  externalUrls: ReadonlyMap<string, ExternalUrls>
): Promise<Movie> {
  const imdbId = imdb_id(movie);
  if (!movie.imdb || !imdbId) return movie;

  const imdbRating = imdbRatings.get(imdbId);
  const imdb = imdbRating ? { ...movie.imdb, star: imdbRating.star } : movie.imdb.star ? movie.imdb : undefined;
  const { rtUrl, mcUrl, letterboxdUrl } = externalUrls.get(imdbId) ?? {};

  const [rtScores, mcScores, lbScore] = await Promise.all([
    rtUrl ? scrape_rotten_tomatoes(rtUrl) : null,
    mcUrl ? scrape_metacritic(mcUrl) : null,
    letterboxdUrl ? scrape_letterboxd(letterboxdUrl) : null,
  ]);

  let rotten_tomatoes = movie.rotten_tomatoes;
  if (rtUrl && rtScores) {
    rotten_tomatoes = { score: rtScores.score, audience_score: rtScores.audience_score, url: rtUrl };
    console.log(`  RT scores for ${movie.title}: ${rtScores.score}% (audience: ${rtScores.audience_score ?? "N/A"}%)`);
  } else if (rtUrl && rotten_tomatoes) {
    rotten_tomatoes = { ...rotten_tomatoes, url: rtUrl };
  }

  let metacritic = movie.metacritic;
  if (mcUrl && mcScores) {
    metacritic = { score: mcScores.score, user_score: mcScores.user_score, url: mcUrl };
    console.log(`  MC scores for ${movie.title}: ${mcScores.score} (user: ${mcScores.user_score ?? "N/A"})`);
  } else if (mcUrl && metacritic) {
    metacritic = { ...metacritic, url: mcUrl };
  }

  const letterboxd = letterboxdUrl ? { score: lbScore?.score, url: letterboxdUrl } : undefined;
  if (lbScore) console.log(`  Letterboxd score for ${movie.title}: ${lbScore.score}/5`);

  return { ...movie, imdb, rotten_tomatoes, metacritic, letterboxd };
}

export async function refresh_movie_catalog() {
  // Independent of which movies are showing, so start it first.
  const imdb_ratings_for = prefetch_imdb_ratings();

  const listings = await map_concurrent(
    Array.from({ length: DAYS_SHOWN }, (_, day) => day),
    CONCURRENCY,
    async (day) => parseHTML(await fetch_text(`https://kvikmyndir.is/bio/syningatimar/?dagur=${day}`, { headers })).document
  );
  const { movieIds, showtimes } = parse_listings(listings);
  console.log(
    `Found ${movieIds.length} movies with ${[...showtimes.values()].flatMap((days) => Object.values(days).flatMap(Object.values)).flat().length} showtimes`
  );

  const details = await load_movie_details(movieIds, fetch_movie_details, {
    cache_path: path.resolve(cacheDirectory, "movie-details.json"),
    max_age_ms: MOVIE_DETAILS_MAX_AGE_MS,
    concurrency: CONCURRENCY,
  });
  const today = reykjavik_date(new Date());
  const movies = movieIds.flatMap((id) => {
    const movie_details = details.get(id);
    const movie_showtimes = showtimes.get(id);
    return (movie_details && movie_showtimes && assemble_movie(movie_details, movie_showtimes, today)) || [];
  });

  // Exiting non-zero keeps the previous deploy live instead of publishing an
  // empty programme.
  if (movies.length === 0) {
    throw new Error(`Assembled no movies from ${movieIds.length} listed ids`);
  }
  const missing = movieIds.filter((id) => !details.has(id));
  if (missing.length > 0) {
    console.warn(`Dropped ${missing.length} of ${movieIds.length} movies whose page could not be fetched or parsed: ${missing.join(", ")}`);
  }

  const imdbIds = movies.flatMap((movie) => imdb_id(movie) ?? []);
  console.log(`Scraped ${movies.length} valid movies. Fetching ratings for ${imdbIds.length} IMDb titles...`);
  const [imdbRatings, externalUrls] = await Promise.all([imdb_ratings_for(imdbIds), fetch_external_urls(imdbIds)]);

  // Ratings come from other hosts than the posters, so run both at once.
  const [moviesWithRatings] = await Promise.all([
    map_concurrent(movies, CONCURRENCY, (movie) => with_ratings(movie, imdbRatings, externalUrls)),
    refresh_posters(movies, staticDirectory, { manifest_path: path.resolve(cacheDirectory, "poster-sources.json"), headers }),
  ]);

  console.log(`Processed ${moviesWithRatings.length} movies. Writing movies.json...`);
  await fs.writeFile(path.resolve(staticDirectory, "movies.json"), JSON.stringify(moviesWithRatings, null, 2));
  console.log("Finished writing movies.json.");
}
