import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { parseHTML } from "linkedom";
import { assemble_movie, parse_movie_details, parse_movie_ids, type MovieDetails } from "../src/lib/parse";
import type { Showtime } from "../src/lib/schemas";

// Snapshot test using saved HTML fixture from kvikmyndir.is
// Fixture: movie 17825 (Project Hail Mary) with future premiere "19. mars 2026"
// This tests that our premiere detection and Smárabíó filtering works
// against real kvikmyndir.is HTML structure.
describe("premiere filtering (fixture)", () => {
  const html = readFileSync(join(__dirname, "fixtures/movie-17825-future-premiere.html"), "utf-8");

  test("detects premiere badge elements in kvikmyndir.is HTML", () => {
    const { document } = parseHTML(html);

    const premiereLabel = document.querySelector("span.mp-hero__premiere-label");
    const premiereDate = document.querySelector("span.mp-hero__premiere-date");

    expect(premiereLabel).not.toBeNull();
    expect(premiereDate).not.toBeNull();
    expect(premiereLabel!.textContent).toContain("Væntanleg");
    expect(premiereDate!.textContent).toMatch(/\d{1,2}\.\s*\S+\s+\d{4}/);
  });

  test("reads the premiere date from the movie page", () => {
    const { document } = parseHTML(html);
    const details = parse_movie_details(document, 17825);

    expect(details).not.toBeNull();
    expect(details!.title).toBe("Project Hail Mary");
    expect(details!.premiere_date).toBe("2026-03-19");
    expect("showtimes_by_day" in details!).toBe(false);
  });
});

describe("parse_movie_ids", () => {
  test("extracts movie IDs from anchor elements", () => {
    const html = `
      <html>
        <body>
          <a class="movie_title" href="/mynd/?id=123">Movie 1</a>
          <a class="movie_title" href="/mynd/?id=456">Movie 2</a>
          <a class="movie_title" href="/mynd/?id=789">Movie 3</a>
        </body>
      </html>
    `;
    const { document } = parseHTML(html);
    const ids = parse_movie_ids(document);
    expect(ids).toEqual([123, 456, 789]);
  });

  test("returns empty array when no movie links found", () => {
    const html = `<html><body><p>No movies here</p></body></html>`;
    const { document } = parseHTML(html);
    const ids = parse_movie_ids(document);
    expect(ids).toEqual([]);
  });

  test("handles malformed hrefs gracefully", () => {
    const html = `
      <html>
        <body>
          <a class="movie_title" href="/mynd/?id=123">Movie 1</a>
          <a class="movie_title" href="/other/path">No ID</a>
          <a class="movie_title" href="/mynd/?id=456">Movie 2</a>
        </body>
      </html>
    `;
    const { document } = parseHTML(html);
    const ids = parse_movie_ids(document);
    // Should skip the malformed href and not crash
    expect(ids.length).toBeGreaterThanOrEqual(2);
  });
});

const details = (premiere_date?: string): MovieDetails => ({
  id: 99999,
  title: "Test Movie",
  release_year: 2030,
  poster_url: "https://example.com/poster.jpg",
  description: "A great movie",
  genres: [],
  duration_in_mins: 0,
  language: [],
  premiere_date,
});

const at = (time: string, purchase_url: string): Showtime => ({ time, purchase_url, hall: "Salur 1" });

describe("assemble_movie", () => {
  const showtimes_by_day = {
    "0": {
      Smárabíó: [at("2026-10-02T17:30:00.000Z", "https://eu.internet-ticketing.com/sales/SMAICE/book?perfcode=99999")],
      Háskólabíó: [at("2026-10-02T20:00:00.000Z", "https://tickets.example.com/show1")],
    },
  };

  test("hides Smárabíó's preview screenings before a future premiere", () => {
    const movie = assemble_movie(details("2030-01-01"), showtimes_by_day, "2026-10-02");

    expect(movie!.showtimes_by_day["0"]["Smárabíó"]).toBeUndefined();
    expect(movie!.showtimes_by_day["0"]["Háskólabíó"]).toHaveLength(1);
  });

  test("keeps Smárabíó screenings once the movie has premiered or has no premiere badge", () => {
    expect(assemble_movie(details("2026-10-01"), showtimes_by_day, "2026-10-02")!.showtimes_by_day["0"]["Smárabíó"]).toHaveLength(1);
    expect(assemble_movie(details(), showtimes_by_day, "2026-10-02")!.showtimes_by_day["0"]["Smárabíó"]).toHaveLength(1);
  });

  test("drops a movie whose only screenings are hidden previews", () => {
    const only_smarabio = { "0": { Smárabíó: showtimes_by_day["0"]["Smárabíó"] } };
    expect(assemble_movie(details("2030-12-01"), only_smarabio, "2026-10-02")).toBeNull();
  });
});
