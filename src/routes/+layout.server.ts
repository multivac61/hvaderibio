import { readFile } from "fs/promises";
import type { Movie } from "$lib/schemas";
import { movies_schema } from "$lib/schemas";

export const prerender = true;

export async function load() {
  const moviesData = JSON.parse(await readFile("static/movies.json", "utf-8"));
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