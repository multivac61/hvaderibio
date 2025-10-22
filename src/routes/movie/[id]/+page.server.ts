import { readFile } from "fs/promises";

export const prerender = true;

export async function entries() {
  const movies = JSON.parse(await readFile("static/movies.json", "utf-8"));
  return movies.map((movie: any) => ({ id: String(movie.id) }));
}
