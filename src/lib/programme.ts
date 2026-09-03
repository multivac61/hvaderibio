import type { Movie, Showtime } from "$lib/schemas";
import { get_valid_showtimes } from "$lib/showtimes";

export type ShowtimeWindow = Readonly<{ from: number; to: number }>;

export type CinemaProgramme = Readonly<{
  cinema: string;
  showtimes: readonly Showtime[];
}>;

const showtimes_for_movie = (movie: Movie, selectedDay: string, selectedCinemas: readonly string[], window: ShowtimeWindow) =>
  Object.entries(movie.showtimes_by_day[selectedDay] ?? {})
    .filter(([cinema]) => selectedCinemas.includes(cinema))
    .map(([cinema, showtimes]) => ({
      cinema,
      showtimes: get_valid_showtimes(showtimes, selectedDay, window.from, window.to),
    }))
    .filter(({ showtimes }) => showtimes.length > 0);

/**
 * Derive the visible programme from a selection and an explicit time window.
 * Keeping the clock outside this module makes the same interface safe for SSR,
 * hydration, and deterministic tests.
 */
export const get_programme_movies = (
  movies: readonly Movie[],
  selectedDay: string,
  selectedCinemas: readonly string[],
  window: ShowtimeWindow
) =>
  movies
    .map((movie) => ({
      movie,
      showtimeCount: showtimes_for_movie(movie, selectedDay, selectedCinemas, window).reduce((n, row) => n + row.showtimes.length, 0),
    }))
    .filter(({ showtimeCount }) => showtimeCount > 0)
    .sort((a, b) => b.showtimeCount - a.showtimeCount)
    .map(({ movie }) => movie);

export const get_movie_programme = (
  movie: Movie,
  selectedDay: string,
  selectedCinemas: readonly string[],
  window: ShowtimeWindow
): CinemaProgramme[] => showtimes_for_movie(movie, selectedDay, selectedCinemas, window);
