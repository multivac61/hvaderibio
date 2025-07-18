import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { parseHTML } from "linkedom";
import sharp from "sharp";

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

// --- Determine Target Image Size for High-Density Displays ---
// Base display width is 360px. For 2x DPR screens, we need 2 * 360 = 720px.
const baseWidth = 360;
const targetWidth = baseWidth * 2; // 720
const targetHeight = Math.round(targetWidth * (3 / 2)); // Calculate height for 2:3 aspect ratio (1080)

console.log(`Targeting image dimensions: ${targetWidth}w x ${targetHeight}h`); // Log target size

const showtimes = await fetch("https://www.kvikmyndir.is/bio/syningatimar", { headers });
const html = await showtimes.text();
const { document } = parseHTML(html);

await Promise.all(
  parse_movie_ids(document).map(async (id: number) => {
    try {
      const movie = await fetch(`https://www.kvikmyndir.is/mynd/?id=${id}`, { headers });
      const { document: movie_document } = parseHTML(await movie.text());
      return parse_movie(movie_document, id);
    } catch (error) {
      console.error(`Failed to fetch/parse movie ID ${id}:`, error);
      return null;
    }
  })
)
  .then(async (movies) => {
    const validMovies = movies.filter((movie): movie is Movie => movie !== null);

    const moviesWithPosters = await Promise.all(
      validMovies.map(async (movie: Movie) => {
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
          } catch (error) {
            // Ignore if file doesn't exist
          }

          // Use sharp to resize to the NEW target dimensions
          await sharp(buffer)
            .resize(targetWidth, targetHeight, { // Use updated dimensions
              fit: 'cover',
            })
            .webp({ 
              quality: 80,
              effort: 6, // Higher effort for better compression
              nearLossless: false,
              smartSubsample: true
            })
            .toFile(webpPath);

          return {
            ...movie,
          };
        } catch (error) {
          console.error(`Failed to process poster for movie ID ${movie.id} (${movie.title}):`, error);
          return { // Still return movie data if poster fails
            ...movie,
          };
        }
      })
    );
    return moviesWithPosters.filter(m => m !== null);
  })
  .then(async (movies) => {
    console.log(`Processed ${movies.length} movies. Writing movies.json...`);
    await fs.writeFile(path.resolve(__dirname, "../static/movies.json"), JSON.stringify(movies, null, 2));
    console.log("Finished writing movies.json.");
  })
  .catch(error => {
    console.error("An error occurred during the main processing chain:", error);
  });


