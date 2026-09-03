import { describe, expect, test } from "bun:test";
import { apply_hall_info, parse_sambio_booking } from "../src/lib/catalog-refresh";
import { parseHTML } from "linkedom";
import { movie_schema, type Showtime } from "../src/lib/schemas";

const showtime = (time: string, purchase_url: string): Showtime => ({ time, purchase_url, hall: "" });

const movie = movie_schema.parse({
  id: 1,
  title: "Movie",
  release_year: 2026,
  poster_url: "https://example.com/poster.jpg",
  description: "",
  genres: [],
  duration_in_mins: 90,
  language: [],
  showtimes_by_day: {
    "0": { Cinema: [showtime("2026-09-03T20:00:00.000Z", "https://example.com/today")] },
    "1": { Cinema: [showtime("2026-09-04T20:00:00.000Z", "https://example.com/tomorrow")] },
  },
});

describe("showtime label provenance", () => {
  test("parses authoritative hall and format labels from a Sambíóin booking", () => {
    const { document } = parseHTML(`
      <div class="schedule-card__info-container">
        <div class="schedule-card__title-container">
          <h3>Movie</h3>
          <p class="bold">Ásberg</p>
        </div>
        <p class="tag">3D</p>
        <p class="tag">ÍSL TAL</p>
      </div>
    `);

    expect(parse_sambio_booking(document)).toMatchObject({
      hall: "Ásberg",
      is_atmos: true,
      is_3d: true,
      is_icelandic: true,
    });
  });

  test("uses labels for an exact showtime URL and never predicts them for a matching future time", () => {
    const enriched = apply_hall_info(
      movie,
      new Map([["https://example.com/today", { hall: "Ásberg", is_atmos: true, is_icelandic: true }]])
    );

    expect(enriched.showtimes_by_day["0"].Cinema[0]).toMatchObject({
      hall: "Ásberg",
      is_atmos: true,
      is_icelandic: true,
    });
    expect(enriched.showtimes_by_day["1"].Cinema[0]).toEqual(movie.showtimes_by_day["1"].Cinema[0]);
  });
});
