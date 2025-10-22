import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { parseHTML } from "linkedom";
import sharp from "sharp";

import type { Movie } from "$lib/schemas";
import { parse_movie, parse_movie_ids, extract_direct_url } from "$lib/parse";

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
      const parsed_movie = parse_movie(movie_document, id);

      if (parsed_movie) {
        // Extract direct URLs from redirect URLs
        const processed_cinema_showtimes: Record<string, any> = {};

        for (const [cinema_name, showtimes] of Object.entries(parsed_movie.cinema_showtimes)) {
          processed_cinema_showtimes[cinema_name] = await Promise.all(
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

        return {
          ...parsed_movie,
          cinema_showtimes: processed_cinema_showtimes,
        };
      }

      return parsed_movie;
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

          // Generate multiple sizes for responsive images
          const image = sharp(buffer);

          // Small size for mobile (360w for 1x displays) - higher compression
          await image
            .clone()
            .resize(360, 540, { fit: "cover" })
            .webp({ quality: 75, effort: 6, nearLossless: false, smartSubsample: true })
            .toFile(path.resolve(__dirname, `../static/${movie.id}-360w.webp`));

          // Medium size for mobile retina (720w for 2x displays)
          await image
            .clone()
            .resize(targetWidth, targetHeight, { fit: "cover" })
            .webp({ quality: 78, effort: 6, nearLossless: false, smartSubsample: true })
            .toFile(webpPath);

          // Large size for desktop (1080w for larger screens)
          await image
            .clone()
            .resize(1080, 1620, { fit: "cover" })
            .webp({ quality: 78, effort: 6, nearLossless: false, smartSubsample: true })
            .toFile(path.resolve(__dirname, `../static/${movie.id}-1080w.webp`));

          return {
            ...movie,
          };
        } catch (error) {
          console.error(`Failed to process poster for movie ID ${movie.id} (${movie.title}):`, error);
          return {
            // Still return movie data if poster fails
            ...movie,
          };
        }
      })
    );
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
