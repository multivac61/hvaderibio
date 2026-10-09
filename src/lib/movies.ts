import { movies_schema } from "#lib/schemas.js";
import { readFile } from "fs/promises";
import { join } from "path";

export async function readMovies() {
  return {
    movies: movies_schema.parse(JSON.parse(await readFile(join(process.cwd(), "static/movies.json"), "utf-8"))),
  };
}
