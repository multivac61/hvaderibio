import { readFile } from "fs/promises";
import { error } from "@sveltejs/kit";
import { movies_schema } from "$lib/schemas";

export const load = async ({ params }) => {
  const movies = JSON.parse(await readFile("static/movies.json", "utf-8"));
  const parsed_movies = movies_schema.parse(movies);
  const movie = parsed_movies.find((m) => m.id === Number(params.id));

  if (!movie) {
    error(404);
  }

  return { movie };
};

// Return entries to be prerendered at compile time
export async function entries() {
  const movies = JSON.parse(await readFile("static/movies.json", "utf-8"));
  const parsed_movies = movies_schema.parse(movies);
  return parsed_movies.map((movie) => ({ id: String(movie.id) }));
}
