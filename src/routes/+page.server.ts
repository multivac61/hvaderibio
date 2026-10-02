import { get_cinema_options } from "#lib/cinemas.js";
import { readMovies } from "#lib/movies.js";
import { to_programme_entry } from "#lib/programme.js";

export const load = async () => {
  const { movies } = await readMovies();

  return {
    // The grid only needs ids, titles, paths and start times; sending the full
    // catalog inlined it twice into every homepage load.
    movies: movies.map((movie) => to_programme_entry(movie, movies)),
    cinema_options: get_cinema_options(movies),
  };
};
