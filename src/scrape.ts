import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { parseHTML } from "linkedom";
import sharp from "sharp"; // Import sharp

import type { Movie } from "$lib/schemas";
import { parse_movie, parse_movie_ids } from "$lib/parse";

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

// --- Determine Target Image Size ---
// From your Svelte code: aspect-[2/3] and max width sm:w-[min(100%,360px)]
// Let's target 360px width for a decent resolution.
const targetWidth = 360;
const targetHeight = Math.round(targetWidth * (3 / 2)); // Calculate height for 2:3 aspect ratio (540)

const showtimes = await fetch("https://www.kvikmyndir.is/bio/syningatimar", { headers });
const html = await showtimes.text();
const { document } = parseHTML(html);

await Promise.all(
  parse_movie_ids(document).map(async (id: number) => {
    try {
      // Add try...catch for robustness
      const movie = await fetch(`https://www.kvikmyndir.is/mynd/?id=${id}`, { headers });
      const { document: movie_document } = parseHTML(await movie.text());
      return parse_movie(movie_document, id);
    } catch (error) {
      console.error(`Failed to fetch/parse movie ID ${id}:`, error);
      return null; // Return null if fetching/parsing fails for a single movie
    }
  })
)
  .then(async (movies) => {
    const validMovies = movies.filter((movie): movie is Movie => movie !== null);

    const moviesWithPosters = await Promise.all(
      validMovies.map(async (movie: Movie) => {
        try {
          // Add try...catch for poster processing
          const res = await fetch(movie.poster_url, { headers });
          if (!res.ok) {
            throw new Error(`Failed to fetch poster ${movie.poster_url}: ${res.statusText}`);
          }
          const buffer = Buffer.from(new Uint8Array(await res.arrayBuffer()));

          const webpPath = path.resolve(__dirname, `../static/${movie.id}.webp`); // Define WebP path

          await sharp(buffer).resize(targetWidth, targetHeight, { fit: "cover" }).webp().toFile(webpPath);

          // No need to return the poster buffer itself anymore
          return {
            ...movie,
          };
        } catch (error) {
          console.error(`Failed to process poster for movie ID ${movie.id} (${movie.title}):`, error);
          // Return the movie data even if poster fails, or return null if preferred
          return {
            ...movie,
          };
        }
      })
    );
    // Filter out any potential nulls from failed poster processing if you chose to return null above
    return moviesWithPosters.filter((m) => m !== null);
  })
  .then(async (movies) => {
    console.log(`Processed ${movies.length} movies. Writing movies.json...`);
    await fs.writeFile(path.resolve(__dirname, "../static/movies.json"), JSON.stringify(movies, null, 2));
    console.log("Finished writing movies.json.");
  })
  .catch((error) => {
    console.error("An error occurred during the main processing chain:", error);
  });
