import { CAPITAL_REGION_CINEMAS, CINEMA_DISPLAY_NAMES } from "$lib/constants";
import type { Movie } from "$lib/schemas";

export type CinemaOption = readonly [string, readonly string[]];

export const get_all_cinemas = (movies: readonly Movie[]) =>
  movies
    .flatMap((movie) => Object.values(movie.showtimes_by_day).flatMap((day) => Object.keys(day)))
    .filter((name, index, array) => array.indexOf(name) === index)
    .sort();

export const get_cinema_options = (movies: readonly Movie[]): readonly CinemaOption[] => {
  const all_cinemas = get_all_cinemas(movies);
  const capital_region_cinemas = all_cinemas.filter((name) => (CAPITAL_REGION_CINEMAS as readonly string[]).includes(name));

  return [
    ["Allt", all_cinemas],
    ["Höfuðborgarsvæðið", capital_region_cinemas],
    ...all_cinemas.map((name) => [CINEMA_DISPLAY_NAMES[name] ?? name, [name]] as const),
  ] as const;
};
