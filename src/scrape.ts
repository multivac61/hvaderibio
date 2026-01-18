import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { parseHTML } from "linkedom";
import sharp from "sharp";

import type { Movie, Showtime } from "$lib/schemas";
import {
  parse_movie,
  parse_movie_ids,
  extract_direct_url,
  fetch_external_urls,
  scrape_rotten_tomatoes,
  scrape_metacritic,
  scrape_letterboxd,
} from "$lib/parse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// --- Determine Target Image Size for High-Density Displays ---
// Base display width is 360px. For 2x DPR screens, we need 2 * 360 = 720px.
const baseWidth = 360;
const targetWidth = baseWidth * 2; // 720
const targetHeight = Math.round(targetWidth * (3 / 2)); // Calculate height for 2:3 aspect ratio (1080)

console.log(`Targeting image dimensions: ${targetWidth}w x ${targetHeight}h`);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function scrapeMovie(id: number): Promise<Movie | null> {
  try {
    const movie = await fetch(`https://www.kvikmyndir.is/mynd/?id=${id}`, { headers });
    const { document: movie_document } = parseHTML(await movie.text());
    const parsed_movie = parse_movie(movie_document, id);

    if (parsed_movie) {
      // Extract direct URLs from redirect URLs for all days
      const processed_showtimes_by_day: Record<string, Record<string, Showtime[]>> = {};

      for (const [day, cinema_showtimes] of Object.entries(parsed_movie.showtimes_by_day)) {
        processed_showtimes_by_day[day] = {};

        for (const [cinema_name, showtimes] of Object.entries(cinema_showtimes)) {
          processed_showtimes_by_day[day][cinema_name] = await Promise.all(
            showtimes.map(async (showtime) => {
              // Only process URLs that are redirect URLs
              if (showtime.purchase_url.includes("showtime_redirect.php")) {
                const direct_url = await extract_direct_url(showtime.purchase_url);
                return {
                  ...showtime,
                  purchase_url: direct_url,
                };
              }
              return showtime;
            })
          );
        }
      }

      return {
        ...parsed_movie,
        showtimes_by_day: processed_showtimes_by_day,
      };
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch/parse movie ID ${id}:`, error);
    return null;
  }
}

async function processMoviePoster(movie: Movie): Promise<Movie> {
  try {
    const res = await fetch(movie.poster_url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch poster ${movie.poster_url}: ${res.statusText}`);
    }
    const buffer = Buffer.from(new Uint8Array(await res.arrayBuffer()));

    const webpPath = path.resolve(__dirname, `../static/${movie.id}.webp`);
    const jpgPath = path.resolve(__dirname, `../static/${movie.id}.jpg`);

    // Clean up any old JPG files
    try {
      await fs.unlink(jpgPath);
    } catch {
      // Ignore if file doesn't exist
    }

    // Generate multiple sizes for responsive images
    const image = sharp(buffer);

    // Small size for mobile (360w for 1x displays) - aggressive compression
    const img360 = image.clone().resize(360, 540, { fit: "cover" });
    await img360
      .clone()
      .webp({ quality: 70, effort: 6, nearLossless: false, smartSubsample: true })
      .toFile(path.resolve(__dirname, `../static/${movie.id}-360w.webp`));

    // Medium size for mobile retina (720w for 2x displays)
    const img720 = image.clone().resize(targetWidth, targetHeight, { fit: "cover" });
    await img720.clone().webp({ quality: 72, effort: 6, nearLossless: false, smartSubsample: true }).toFile(webpPath);

    // Large size for desktop (1080w for larger screens)
    const img1080 = image.clone().resize(1080, 1620, { fit: "cover" });
    await img1080
      .clone()
      .webp({ quality: 72, effort: 6, nearLossless: false, smartSubsample: true })
      .toFile(path.resolve(__dirname, `../static/${movie.id}-1080w.webp`));

    return movie;
  } catch (error) {
    console.error(`Failed to process poster for movie ID ${movie.id} (${movie.title}):`, error);
    // Still return movie data if poster fails
    return movie;
  }
}

async function main() {
  const showtimesResponse = await fetch("https://www.kvikmyndir.is/bio/syningatimar", { headers });
  const html = await showtimesResponse.text();
  const { document } = parseHTML(html);

  const movieIds = parse_movie_ids(document);
  console.log(`Found ${movieIds.length} movies to scrape`);

  // Process movies sequentially with rate limiting to avoid overwhelming the server
  const movies: Movie[] = [];
  for (const id of movieIds) {
    await delay(100); // 100ms delay between requests
    const movie = await scrapeMovie(id);
    if (movie) {
      movies.push(movie);
    }
  }

  console.log(`Scraped ${movies.length} valid movies. Fetching external URLs and scores...`);

  // Fetch RT, Metacritic, and Letterboxd URLs from Wikidata, then scrape scores
  const moviesWithUrls = await Promise.all(
    movies.map(async (movie) => {
      if (!movie.imdb?.link) return movie;

      const imdbId = movie.imdb.link.match(/tt\d+/)?.[0];
      if (!imdbId) return movie;

      await delay(100); // Rate limit Wikidata requests
      const { rtUrl, mcUrl, letterboxdUrl } = await fetch_external_urls(imdbId);

      let rotten_tomatoes = movie.rotten_tomatoes;
      let metacritic = movie.metacritic;
      let letterboxd: { score?: number; url?: string } | undefined;

      // Scrape RT scores if we have a URL
      if (rtUrl) {
        await delay(200);
        const rtScores = await scrape_rotten_tomatoes(rtUrl);
        if (rtScores?.score !== undefined) {
          rotten_tomatoes = {
            score: rtScores.score,
            audience_score: rtScores.audience_score,
            url: rtUrl,
          };
          console.log(`  RT scores for ${movie.title}: ${rtScores.score}% (audience: ${rtScores.audience_score ?? "N/A"}%)`);
        } else if (movie.rotten_tomatoes) {
          // Keep kvikmyndir.is score but add URL
          rotten_tomatoes = { ...movie.rotten_tomatoes, url: rtUrl };
        }
      }

      // Scrape MC scores if we have a URL
      if (mcUrl) {
        await delay(200);
        const mcScores = await scrape_metacritic(mcUrl);
        if (mcScores?.score !== undefined) {
          metacritic = {
            score: mcScores.score,
            user_score: mcScores.user_score,
            url: mcUrl,
          };
          console.log(`  MC scores for ${movie.title}: ${mcScores.score} (user: ${mcScores.user_score ?? "N/A"})`);
        } else if (movie.metacritic) {
          // Keep kvikmyndir.is score but add URL
          metacritic = { ...movie.metacritic, url: mcUrl };
        }
      }

      // Scrape Letterboxd score if we have a URL
      if (letterboxdUrl) {
        await delay(200);
        const lbScore = await scrape_letterboxd(letterboxdUrl);
        if (lbScore?.score !== undefined) {
          letterboxd = {
            score: lbScore.score,
            url: letterboxdUrl,
          };
          console.log(`  Letterboxd score for ${movie.title}: ${lbScore.score}/5`);
        } else {
          // Still include URL even without score
          letterboxd = { url: letterboxdUrl };
        }
      }

      return {
        ...movie,
        rotten_tomatoes,
        metacritic,
        letterboxd,
      };
    })
  );

  console.log(`Fetched external URLs. Processing posters...`);

  // Process posters (can be done in parallel since they're different URLs)
  const moviesWithPosters = await Promise.all(moviesWithUrls.map(processMoviePoster));

  console.log(`Processed ${moviesWithPosters.length} movies. Writing movies.json...`);
  await fs.writeFile(path.resolve(__dirname, "../static/movies.json"), JSON.stringify(moviesWithPosters, null, 2));
  console.log("Finished writing movies.json.");
}

main().catch((error) => {
  console.error("An error occurred during the main processing chain:", error);
  process.exit(1);
});
