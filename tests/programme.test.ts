import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { get_movie_programme, get_programme_movies, to_programme_entry } from "../src/lib/programme";
import { movie_schema, type Showtime } from "../src/lib/schemas";

const showtime = (time: string, purchase_url: string): Showtime => ({
  time,
  purchase_url,
  hall: "",
});

const movie = (id: number, showtimes_by_day: Record<string, Showtime[]>) =>
  movie_schema.parse({
    id,
    title: `Movie ${id}`,
    release_year: 2026,
    poster_url: `https://example.com/${id}.jpg`,
    description: "",
    genres: [],
    duration_in_mins: 90,
    language: [],
    showtimes_by_day: Object.fromEntries(Object.entries(showtimes_by_day).map(([day, showtimes]) => [day, { Cinema: showtimes }])),
  });

const purchase_urls = (rows: ReturnType<typeof get_movie_programme>) => rows.flatMap((row) => row.showtimes.map((s) => s.purchase_url));

// Visitors abroad must still see Icelandic wall-clock days and hours.
let original_tz: string | undefined;
beforeAll(() => {
  original_tz = process.env.TZ;
  process.env.TZ = "America/New_York";
});
afterAll(() => {
  process.env.TZ = original_tz;
});

describe("programme", () => {
  const evening = new Date("2026-09-03T12:00:00.000Z");

  test("filters, deduplicates, and orders movies by visible showtime count", () => {
    const repeated = showtime("2026-09-03T20:00:00.000Z", "https://example.com/ticket-1");
    const movies = [
      movie(1, { "0": [repeated] }),
      movie(2, {
        "0": [
          showtime("2026-09-03T19:00:00.000Z", "https://example.com/ticket-2"),
          showtime("2026-09-03T21:00:00.000Z", "https://example.com/ticket-3"),
          repeated,
          repeated,
        ],
      }),
    ];

    const entries = movies.map((m) => to_programme_entry(m, movies));

    expect(get_programme_movies(entries, "0", ["Cinema"], evening).map(({ id }) => id)).toEqual([2, 1]);
  });

  test("reduces a movie to what the programme grid needs", () => {
    const selected = movie(7, {
      "0": [showtime("2026-09-03T20:00:00.000Z", "https://example.com/a"), showtime("2026-09-03T20:00:00.000Z", "https://example.com/a")],
      "1": [showtime("2026-09-04T20:00:00.000Z", "https://example.com/b"), showtime("2026-09-04T20:00:00.000Z", "https://example.com/c")],
    });

    expect(to_programme_entry(selected, [selected])).toEqual({
      id: 7,
      title: "Movie 7",
      path: "movie-7",
      // Duplicate listings collapse; distinct screenings at the same time stay.
      times: { Cinema: ["2026-09-03T20:00:00.000Z", "2026-09-04T20:00:00.000Z", "2026-09-04T20:00:00.000Z"] },
    });
  });

  test("hides today's showtimes that started before the current Reykjavik hour", () => {
    const selected = movie(1, {
      "0": [
        showtime("2026-09-03T10:00:00.000Z", "https://example.com/early"),
        showtime("2026-09-03T20:00:00.000Z", "https://example.com/evening"),
      ],
    });

    const rows = get_movie_programme(selected, "0", ["Cinema"], new Date("2026-09-03T18:30:00.000Z"));

    expect(purchase_urls(rows)).toEqual(["https://example.com/evening"]);
  });

  test("keeps the evening's showtimes listed late at night", () => {
    const selected = movie(1, { "0": [showtime("2026-09-03T21:10:00.000Z", "https://example.com/late")] });

    const rows = get_movie_programme(selected, "0", ["Cinema"], new Date("2026-09-03T23:30:00.000Z"));

    expect(purchase_urls(rows)).toEqual(["https://example.com/late"]);
  });

  test("picks days by Reykjavik date when the catalog was scraped before midnight", () => {
    // Scraped at 22:00 on 3 September: bucket "0" is the 3rd, "1" is the 4th.
    const selected = movie(1, {
      "0": [showtime("2026-09-03T22:30:00.000Z", "https://example.com/yesterday")],
      "1": [
        showtime("2026-09-04T17:00:00.000Z", "https://example.com/today"),
        showtime("2026-09-04T22:00:00.000Z", "https://example.com/tonight"),
      ],
      "2": [showtime("2026-09-05T20:00:00.000Z", "https://example.com/tomorrow")],
    });
    const after_midnight = new Date("2026-09-04T01:30:00.000Z");

    expect(purchase_urls(get_movie_programme(selected, "0", ["Cinema"], after_midnight))).toEqual([
      "https://example.com/today",
      "https://example.com/tonight",
    ]);
    expect(purchase_urls(get_movie_programme(selected, "1", ["Cinema"], after_midnight))).toEqual(["https://example.com/tomorrow"]);
  });
});
