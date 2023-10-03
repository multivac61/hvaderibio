import type { RequestEvent } from "@sveltejs/kit";

import { parseHTML } from "linkedom";
import sharp from "sharp";

import { parse_movie, parse_movie_ids } from "$lib/parse";

export const prerender = true;

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

export async function load({ fetch, setHeaders }: RequestEvent) {
  setHeaders({ "cache-control": "1800" });
  const showtimes = await fetch("https://www.kvikmyndir.is/bio/syningatimar", { headers });
  const { document } = parseHTML(await showtimes.text());
  return {
    today: `Í dag, ${new Date()
      .toLocaleString("is-IS", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .replace("dagur", "daginn")}`,
    movies: Promise.all(
      parse_movie_ids(document).map(async (id: number) => {
        const movie = await fetch(`https://www.kvikmyndir.is/mynd/?id=${id}`, { headers });
        const { document: movie_document } = parseHTML(await movie.text());
        return parse_movie(movie_document, id);
      })
    ).then(async (movies) => {
      const moviesWithPostersAndImdbRating = await Promise.all(
        movies.map(async (movie) => {
          let imdb: { star: number; link: string } | undefined = undefined;
          const imdbLink = movie.rating_urls?.find((link) => link?.includes("imdb.com"));
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

          const res = await fetch(movie.poster_url, { headers });
          const abuffer = await res.arrayBuffer();
          const buffer = Buffer.from(new Uint8Array(abuffer));
          await sharp(buffer).resize({ height: 393, width: 262 }).toFile(`static/${movie.id}.webp`);

          return {
            ...movie,
            imdb,
          };
        })
      );
      return moviesWithPostersAndImdbRating;
    }),
  };
}
