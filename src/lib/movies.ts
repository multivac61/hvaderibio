import { movies_schema } from "./schemas";
import { readFile } from "fs/promises";

export async function readMovies() {
  return {
    movies: movies_schema.parse(JSON.parse(await readFile("static/movies.json", "utf-8"))),
  };
}
