import type { Movie } from "$lib/schemas";
import { movies_schema } from "$lib/schemas";
import moviesData from "../../static/movies.json";

export const prerender = true;

export async function load() {
  const validatedMovies = movies_schema.parse(moviesData);
  
  return {
    today: `Í dag, ${new Date()
      .toLocaleString("is-IS", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .replace("dagur", "daginn")}`,
    movies: validatedMovies satisfies Movie[],
  };
}