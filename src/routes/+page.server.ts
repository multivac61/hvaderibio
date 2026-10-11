import { get_cinema_options } from "#lib/cinemas.js";
import { readMovies } from "#lib/movies.js";
import { get_programme_movies, to_programme_entry } from "#lib/programme.js";
import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice } from "#lib/selection.svelte.js";

export const load = async () => {
  const { movies } = await readMovies();
  // The grid only needs ids, titles, paths and start times; sending the full
  // catalog inlined it twice into every homepage load.
  const entries = movies.map((movie) => to_programme_entry(movie, movies));
  const cinema_options = get_cinema_options(movies);

  // Today's grid for the default cinemas, as of the hourly build, so the
  // posters are in the page itself rather than waiting for the app. The
  // browser keeps this order, only dropping films that have ended since.
  // Tests pin the build's clock to their fixture's day.
  const built_at = process.env.PRERENDER_TIME ? new Date(process.env.PRERENDER_TIME) : new Date();
  const prerendered = get_programme_movies(entries, "0", get_cinemas_for_choice(DEFAULT_CINEMA_CHOICE, cinema_options), built_at);

  return {
    movies: entries,
    cinema_options,
    prerendered: prerendered.map(({ id }) => id),
  };
};
