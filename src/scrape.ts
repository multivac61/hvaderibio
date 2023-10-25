import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { parseHTML } from "linkedom";
import sharp from "sharp";

import type { Movie } from "$lib/schemas";
import { parse_movie, parse_movie_ids } from "$lib/parse";

// https://flaviocopes.com/fix-dirname-not-defined-es-module-scope/
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

const showtimes = await fetch("https://www.kvikmyndir.is/bio/syningatimar", { headers });
const html = await showtimes.text();
const { document } = parseHTML(html);
await Promise.all(
  parse_movie_ids(document).map(async (id: number) => {
    const movie = await fetch(`https://www.kvikmyndir.is/mynd/?id=${id}`, { headers });
    const { document: movie_document } = parseHTML(await movie.text());
    return parse_movie(movie_document, id);
  })
)
  .then(async (movies) => {
    const moviesWithPostersAndImdbRating = await Promise.all(
      movies
        .filter((movie: Movie | null) => movie !== null)
        .map(async (movie: Movie | null) => {
          if (!movie) return; // Silence typescript errors...

          let imdb: { star: number; link: string } | undefined = undefined;
          const imdbLink = movie.rating_urls?.find((link: string | undefined) => link?.includes("imdb.com"));
          if (imdbLink) {
            try {
              const imdbId = new URL(imdbLink).pathname.split("/").at(-1);
              imdb = {
                star: await fetch(`https://imdb-api.projects.thetuhin.com/title/${imdbId}`)
                  .then(async (response: Response) => await response.json())
                  .then((response: { rating: { star: number } }) => response.rating.star),
                link: imdbLink,
              };
            } catch (e) {
              console.error(e, imdbLink);
            }
          }

          const res = await fetch(movie!.poster_url, { headers });
          const buffer = Buffer.from(new Uint8Array(await res.arrayBuffer()));
          await sharp(buffer)
            .resize({ height: 393, width: 262 })
            .toFile(path.resolve(__dirname, `../static/${movie!.id}.webp`));

          return {
            ...movie,
            imdb,
          };
        })
    );
    return moviesWithPostersAndImdbRating;
  })
  .then(async (movies) => {
    await fs.writeFile(path.resolve(__dirname, "../static/movies.json"), JSON.stringify(movies, null, 2));
  });
