import { readMovies } from "$lib/movies";
import { CAPITAL_REGION_CINEMAS } from "$lib/constants";

export const load = async () => {
  const { movies } = await readMovies();

  const all_cinemas = movies
    .flatMap((movie) => Object.values(movie.showtimes_by_day).flatMap((day) => Object.keys(day)))
    .filter((name, index, array) => array.indexOf(name) === index)
    .sort();

  const capital_region_cinemas = all_cinemas.filter((name) => (CAPITAL_REGION_CINEMAS as readonly string[]).includes(name));

  const cinema_options = [
    ["Öll kvikmyndahús", all_cinemas],
    ["Höfuðborgarsvæðið", capital_region_cinemas],
    ...all_cinemas.map((name) => [name, [name]] as const),
  ] as const;

  return {
    movies,
    cinema_options,
  };
};
