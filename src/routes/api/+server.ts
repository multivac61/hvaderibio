import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import movies from "../../../static/movies.json";

export const prerender = true;

export const GET: RequestHandler = async () => {
  return json(movies);
};
