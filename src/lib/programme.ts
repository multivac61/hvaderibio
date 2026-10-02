import type { Movie, Showtime } from "#lib/schemas.js";
import { get_visible_showtimes } from "#lib/showtimes.js";

export type CinemaProgramme = Readonly<{
  cinema: string;
  showtimes: readonly Showtime[];
}>;

// Merge the scraper's day buckets; showtimes are re-assigned to days by date.
const showtimes_by_cinema = (movie: Movie) => {
  const by_cinema = new Map<string, Showtime[]>();
  for (const cinemas of Object.values(movie.showtimes_by_day)) {
    for (const [cinema, showtimes] of Object.entries(cinemas)) {
      by_cinema.set(cinema, [...(by_cinema.get(cinema) ?? []), ...showtimes]);
    }
  }
  return by_cinema;
};

const showtimes_for_movie = (movie: Movie, selectedDay: string, selectedCinemas: readonly string[], now: Date) =>
  [...showtimes_by_cinema(movie)]
    .filter(([cinema]) => selectedCinemas.includes(cinema))
    .map(([cinema, showtimes]) => ({
      cinema,
      showtimes: get_visible_showtimes(showtimes, selectedDay, now),
    }))
    .filter(({ showtimes }) => showtimes.length > 0);

/**
 * Derive the visible programme from a selection and an explicit clock.
 * Keeping the clock outside this module makes the same interface safe for SSR,
 * hydration, and deterministic tests.
 */
export const get_programme_movies = (movies: readonly Movie[], selectedDay: string, selectedCinemas: readonly string[], now: Date) =>
  movies
    .map((movie) => ({
      movie,
      showtimeCount: showtimes_for_movie(movie, selectedDay, selectedCinemas, now).reduce((n, row) => n + row.showtimes.length, 0),
    }))
    .filter(({ showtimeCount }) => showtimeCount > 0)
    .sort((a, b) => b.showtimeCount - a.showtimeCount)
    .map(({ movie }) => movie);

export const get_movie_programme = (movie: Movie, selectedDay: string, selectedCinemas: readonly string[], now: Date): CinemaProgramme[] =>
  showtimes_for_movie(movie, selectedDay, selectedCinemas, now);
