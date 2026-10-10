import { get_cinema_options } from "#lib/cinemas.js";
import { readMovies } from "#lib/movies.js";
import { lead_posters, to_programme_entry } from "#lib/programme.js";
import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice } from "#lib/selection.svelte.js";

export const load = async () => {
  const { movies } = await readMovies();
  // The grid only needs ids, titles, paths and start times; sending the full
  // catalog inlined it twice into every homepage load.
  const entries = movies.map((movie) => to_programme_entry(movie, movies));
  const cinema_options = get_cinema_options(movies);

  return {
    movies: entries,
    cinema_options,
    // The grid renders only once the browser knows the time, so the posters
    // leading it would start downloading late. Name them at prerender, from
    // the hourly build's clock, for the page to preload.
    lead_posters: lead_posters(entries, get_cinemas_for_choice(DEFAULT_CINEMA_CHOICE, cinema_options), new Date()),
  };
};
