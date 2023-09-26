import { movies_schema, type Movie } from "$lib/schemas";
import type { RequestEvent } from "@sveltejs/kit";
import { parseHTML } from "linkedom";
import { string } from "zod";

export const prerender = true;
const headers = {
  authority: "kvikmyndir.is/",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,la;q=0.7",
  "cache-control": "max-age=0",
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

async function parse_trailer({ document }: typeof globalThis) {
  const youtube_id = document?.querySelector("iframe")?.getAttribute("src")?.split("/")?.at(-1)?.replace("?autoplay=1", "");
  return {
    trailer_url: `https://www.youtube.com/watch?v=${youtube_id}`,
  };
}

function parse_movie({ document }: typeof globalThis) {
  return {
    title: document.querySelector("h1")?.firstChild?.textContent?.trim(),
    alt_title: document.querySelector("div.top_details > h4")?.textContent?.replace(/\(|\)/g, ""),
    release_year: document?.querySelector("span.year")?.textContent?.trim(),
    poster_url: document.querySelector("div.poster > a")?.getAttribute("href")?.trim(),
    content_rating_in_years: document.querySelector("span.certtext")?.textContent?.trim(),
    scrape_url: document.URL,
    description: document.querySelector("p.description")?.textContent?.trim(),
    genres: [...document.querySelectorAll("div.genres span")].map((genre) => genre?.textContent),
    duration_in_mins: parseInt(document.querySelector("span.duration")?.textContent?.replace("mín", "").replace("MÍN", "").trim() ?? "0"),
    rating_urls: new Set(
      [...document.querySelectorAll("div.movie-ratings > div.rating-box > a")].map((h) => {
        return h?.getAttribute("href");
      })
    ),
    language: [...document.querySelectorAll("div.combined_details > span:nth-child(2)")].map((l) => l?.textContent?.trim()),
  };
}

export async function load({ fetch }: RequestEvent) {
  const showtimes = await fetch("https://www.kvikmyndir.is/bio/syningatimar/", { headers });
  const { document } = parseHTML(await showtimes.text());

  const movies = await Promise.all(
    [...document.querySelectorAll("div.stimar")].map(async (movie) => {
      const id = movie
        .querySelector("a.movie_title")
        ?.getAttribute("href")
        ?.replace(/[^0-9]/g, "");
      const movie_response = await fetch(`https://www.kvikmyndir.is/mynd/?id=${id}`, { headers });
      const trailer_response = await fetch(`https://kvikmyndir.is/trailer_view/?id=${id}`, { headers });
      return {
        showtimes: [...movie.querySelectorAll("div.biotimar")]
          .map((cinema) => {
            return [...cinema.querySelectorAll("li.qtip.tip-top")].map((showtime) => {
              return {
                time: showtime.querySelector("a.rate")?.textContent?.replace(".", ":").trim(),
                cinema: cinema.querySelector("h3")?.getAttribute("text")?.trim(),
                purchase_url: showtime.querySelector("a.rate")?.getAttribute("href")?.trim(),
                hall: showtime.querySelector("div.salur")?.getAttribute("text")?.trim(),
              };
            });
          })
          .filter((showtimes) => showtimes.length > 0),
        kvikmyndir_is_id: id,
        ...parse_movie(parseHTML(await movie_response.text())),
        ...parse_trailer(parseHTML(await trailer_response.text())),
      };
    })
  );

  console.dir(movies, { depth: null });

  return { movies: movies_schema.parse(movies) };
}
