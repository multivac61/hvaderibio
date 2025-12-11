import { prerender } from "$app/server";
import { error } from "@sveltejs/kit";
import { readMovies } from "./movies";
import { CAPITAL_REGION_CINEMAS } from "./constants";

const { movies } = await readMovies();

export const getMovies = prerender(async () => {
  return movies;
});

export const getMovie = prerender("unchecked", (slug: string) => {
  const movie = movies.find((m) => m.id === Number(slug));
  if (!movie) {
    error(404, "Movie not found");
  }
  return movie;
});

// Compute cinema options at build time
export const getCinemaOptions = prerender(async () => {
  const all_cinemas = movies
    .flatMap((movie) => Object.keys(movie.cinema_showtimes))
    .filter((name, index, array) => array.indexOf(name) === index)
    .sort();

  const capital_region_cinemas = all_cinemas.filter((name) => (CAPITAL_REGION_CINEMAS as readonly string[]).includes(name));

  const all_choices = all_cinemas.map((name) => [name, [name]] as const);

  const group_choices = [
    ["Öll kvikmyndahús", all_cinemas],
    ["Höfuðborgarsvæðið", capital_region_cinemas],
  ] as const;
  return [...group_choices, ...all_choices] as const;
});
