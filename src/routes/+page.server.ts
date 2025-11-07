import { movies_schema } from "$lib/schemas";
import { readFile } from "fs/promises";

export const load = async () => {
  return {
    movies: movies_schema.parse(JSON.parse(await readFile("static/movies.json", "utf-8"))),
  };
};
