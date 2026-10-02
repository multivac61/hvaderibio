import type { RequestHandler } from "./$types";
import movies from "../../../static/movies.json";

export const prerender = true;

export const GET: RequestHandler = async () => {
  return Response.json(movies);
};
