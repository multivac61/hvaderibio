import { movies_schema, type Movie } from "$lib/schemas";
import type { RequestEvent } from "./$types";

export const prerender = true;

export async function load({ fetch }: RequestEvent) {
  return {
    movies: await fetch("kvikmyndir_is.json")
      .then(async (response: Response) => movies_schema.parse(await response.json()))
      .then(async (movies: Movie[]) => {
        return Promise.all(
          movies.map(async (movie) => {
            const imdbLink = movie.rating_urls.find((link) => link.includes("imdb.com"));
            try {
              const imdbId = new URL(imdbLink ?? "").pathname.split("/").at(-1);
              return {
                ...movie,
                imdb: {
                  star: await fetch(`https://imdb-api.projects.thetuhin.com/title/${imdbId}`)
                    .then(async (response: Response) => await response.json())
                    .then((response: { rating: { star: number } }) => response.rating.star),
                  link: imdbLink,
                },
              };
            } catch (e) {
              console.error(e, imdbLink);
            }
            return movie;
          })
        );
      }),
    today: `Í dag, ${new Date()
      .toLocaleString("is-IS", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .replace("dagur", "daginn")}`,
  };
}
