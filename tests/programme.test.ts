import { describe, expect, test } from "bun:test";
import { get_movie_programme, get_programme_movies } from "../src/lib/programme";
import { movie_schema, type Showtime } from "../src/lib/schemas";

const showtime = (time: string, purchase_url: string): Showtime => ({
  time,
  purchase_url,
  hall: "",
});

const movie = (id: number, showtimes: Showtime[]) =>
  movie_schema.parse({
    id,
    title: `Movie ${id}`,
    release_year: 2026,
    poster_url: `https://example.com/${id}.jpg`,
    description: "",
    genres: [],
    duration_in_mins: 90,
    language: [],
    showtimes_by_day: { "0": { Cinema: showtimes } },
  });

describe("programme", () => {
  test("filters, deduplicates, and orders movies by visible showtime count", () => {
    const repeated = showtime("2026-09-03T20:00:00.000Z", "https://example.com/ticket-1");
    const movies = [
      movie(1, [repeated]),
      movie(2, [
        showtime("2026-09-03T19:00:00.000Z", "https://example.com/ticket-2"),
        showtime("2026-09-03T21:00:00.000Z", "https://example.com/ticket-3"),
        repeated,
        repeated,
      ]),
    ];

    expect(get_programme_movies(movies, "0", ["Cinema"], { from: 0, to: 24 }).map(({ id }) => id)).toEqual([2, 1]);
  });

  test("returns grouped rows for a single movie through the same rules", () => {
    const selected = movie(1, [
      showtime("2026-09-03T10:00:00.000Z", "https://example.com/early"),
      showtime("2026-09-03T20:00:00.000Z", "https://example.com/evening"),
    ]);

    const rows = get_movie_programme(selected, "0", ["Cinema"], { from: 18, to: 24 });

    expect(rows).toHaveLength(1);
    expect(rows[0].showtimes.map(({ purchase_url }) => purchase_url)).toEqual(["https://example.com/evening"]);
  });
});
