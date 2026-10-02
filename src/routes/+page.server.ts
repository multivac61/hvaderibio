import { get_cinema_options } from "#lib/cinemas.js";
import { readMovies } from "#lib/movies.js";

export const load = async () => {
  const { movies } = await readMovies();

  const cinema_options = get_cinema_options(movies);

  return {
    movies,
    cinema_options,
  };
};
