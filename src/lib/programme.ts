import { movie_path_segment } from "#lib/movie-path.js";
import type { Movie, Showtime } from "#lib/schemas.js";
import { get_visible_showtimes, is_visible_time, unique_showtimes } from "#lib/showtimes.js";

export type CinemaProgramme = Readonly<{
  cinema: string;
  showtimes: readonly Showtime[];
}>;

/** What the programme grid needs from a movie, a fraction of the full record. */
export type ProgrammeEntry = Readonly<{
  id: number;
  title: string;
  path: string;
  /** Screening start times per cinema, across all scraped days. */
  times: Readonly<Record<string, readonly string[]>>;
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

export const to_programme_entry = (movie: Movie, catalog: readonly Movie[]): ProgrammeEntry => ({
  id: movie.id,
  title: movie.title,
  path: movie_path_segment(movie, catalog),
  times: Object.fromEntries(
    [...showtimes_by_cinema(movie)].map(([cinema, showtimes]) => [cinema, unique_showtimes(showtimes).map(({ time }) => time)])
  ),
});

/**
 * Order the movies with screenings for the selection by how many remain.
 * The clock is passed in so the same interface is safe for SSR, hydration,
 * and deterministic tests.
 */
export const get_programme_movies = (
  entries: readonly ProgrammeEntry[],
  selectedDay: string,
  selectedCinemas: readonly string[],
  now: Date
) =>
  entries
    .map((entry) => ({
      entry,
      count: selectedCinemas.reduce(
        (n, cinema) => n + (entry.times[cinema] ?? []).filter((time) => is_visible_time(time, selectedDay, now)).length,
        0
      ),
    }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
    .map(({ entry }) => entry);

export const get_movie_programme = (movie: Movie, selectedDay: string, selectedCinemas: readonly string[], now: Date): CinemaProgramme[] =>
  [...showtimes_by_cinema(movie)]
    .filter(([cinema]) => selectedCinemas.includes(cinema))
    .map(([cinema, showtimes]) => ({ cinema, showtimes: get_visible_showtimes(showtimes, selectedDay, now) }))
    .filter(({ showtimes }) => showtimes.length > 0);

/**
 * How many posters lead the grid with high fetch priority. Only the first
 * counts as the largest paint, since a poster of the same size painted later
 * does not replace it, so the others give way to it.
 */
export const LEAD_POSTER_COUNT = 1;

/**
 * How many posters load with the page: a phone's first screen (three rows of
 * two) and the first two rows of a laptop's grid. The rest wait until
 * scrolled near; on a wider screen the browser still fetches the lazy ones in
 * view right after layout.
 */
export const EAGER_POSTER_COUNT = 6;

/**
 * The movies on `fresh`, in the order `ordered` (ids) listed them. A poster
 * grid the visitor already sees then only loses films that have ended rather
 * than reshuffling; films it did not list follow in their own order.
 */
export const keep_order = <T extends Pick<ProgrammeEntry, "id">>(ordered: readonly number[], fresh: readonly T[]): T[] => {
  const by_id = new Map(fresh.map((entry) => [entry.id, entry]));
  const kept = ordered.flatMap((id) => by_id.get(id) ?? []);
  const kept_ids = new Set(kept.map(({ id }) => id));
  return [...kept, ...fresh.filter(({ id }) => !kept_ids.has(id))];
};
