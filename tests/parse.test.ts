import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { parseHTML } from "linkedom";
import { parse_movie, parse_movie_ids, parse_showtimes_by_day } from "../src/lib/parse";

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

  test("filters Smárabíó showtimes for movie with future premiere", () => {
    const { document } = parseHTML(html);
    const movie = parse_movie(document, 17825);

    expect(movie).not.toBeNull();
    expect(movie!.title).toBe("Project Hail Mary");

    // Smárabíó should have no showtimes (filtered as hidden preview)
    for (const [, cinemas] of Object.entries(movie!.showtimes_by_day)) {
      expect(cinemas["Smárabíó"]).toBeUndefined();
    }
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

describe("parse_movie premiere filtering", () => {
  test("filters Smárabíó showtimes when movie has future premiere date", () => {
    // Set premiere to a date far in the future
    const html = `
      <html><body>
        <h1 class="mp-hero__title">Test Movie <span class="mp-hero__year">(2030)</span></h1>
        <div class="mp-hero__poster"><img src="https://example.com/poster.jpg" /></div>
        <p class="mp-hero__tagline">A great movie</p>
        <div class="mp-hero__premiere-badge">
          <span class="mp-hero__premiere-label">Væntanleg í bíó:</span>
          <span class="mp-hero__premiere-date">1.  janúar  2030</span>
        </div>
        <div class="mp-showtimes__day" data-date="0">
          <div class="mp-showtimes__cinema">
            <span class="mp-showtimes__cinema-name">Smárabíó</span>
            <a class="mp-showtimes__time" href="https://eu.internet-ticketing.com/sales/SMAICE/book?perfcode=99999">
              <span class="mp-showtimes__time-value">17:30</span>
            </a>
          </div>
          <div class="mp-showtimes__cinema">
            <span class="mp-showtimes__cinema-name">Háskólabíó</span>
            <a class="mp-showtimes__time" href="https://tickets.example.com/show1">
              <span class="mp-showtimes__time-value">20:00</span>
            </a>
          </div>
        </div>
      </body></html>
    `;
    const { document } = parseHTML(html);
    const movie = parse_movie(document, 99999);

    expect(movie).not.toBeNull();
    // Smárabíó showtimes should be filtered out
    expect(movie!.showtimes_by_day["0"]?.["Smárabíó"]).toBeUndefined();
    // Other cinemas should remain
    expect(movie!.showtimes_by_day["0"]?.["Háskólabíó"]).toBeDefined();
    expect(movie!.showtimes_by_day["0"]["Háskólabíó"].length).toBe(1);
  });

  test("keeps Smárabíó showtimes when movie has no premiere badge", () => {
    const html = `
      <html><body>
        <h1 class="mp-hero__title">Regular Movie <span class="mp-hero__year">(2026)</span></h1>
        <div class="mp-hero__poster"><img src="https://example.com/poster.jpg" /></div>
        <p class="mp-hero__tagline">A regular movie</p>
        <div class="mp-showtimes__day" data-date="0">
          <div class="mp-showtimes__cinema">
            <span class="mp-showtimes__cinema-name">Smárabíó</span>
            <a class="mp-showtimes__time" href="https://eu.internet-ticketing.com/sales/SMAICE/book?perfcode=11111">
              <span class="mp-showtimes__time-value">19:00</span>
            </a>
          </div>
        </div>
      </body></html>
    `;
    const { document } = parseHTML(html);
    const movie = parse_movie(document, 11111);

    expect(movie).not.toBeNull();
    // Smárabíó showtimes should be kept
    expect(movie!.showtimes_by_day["0"]?.["Smárabíó"]).toBeDefined();
    expect(movie!.showtimes_by_day["0"]["Smárabíó"].length).toBe(1);
  });

  test("removes movie entirely if only Smárabíó had showtimes for a future premiere", () => {
    const html = `
      <html><body>
        <h1 class="mp-hero__title">Smárabíó Only <span class="mp-hero__year">(2030)</span></h1>
        <div class="mp-hero__poster"><img src="https://example.com/poster.jpg" /></div>
        <p class="mp-hero__tagline">Only at Smárabíó</p>
        <div class="mp-hero__premiere-badge">
          <span class="mp-hero__premiere-label">Væntanleg í bíó:</span>
          <span class="mp-hero__premiere-date">1.  desember  2030</span>
        </div>
        <div class="mp-showtimes__day" data-date="0">
          <div class="mp-showtimes__cinema">
            <span class="mp-showtimes__cinema-name">Smárabíó</span>
            <a class="mp-showtimes__time" href="https://eu.internet-ticketing.com/sales/SMAICE/book?perfcode=22222">
              <span class="mp-showtimes__time-value">20:00</span>
            </a>
          </div>
        </div>
      </body></html>
    `;
    const { document } = parseHTML(html);
    const movie = parse_movie(document, 22222);

    expect(movie).not.toBeNull();
    // All showtimes should be empty after filtering
    expect(Object.keys(movie!.showtimes_by_day)).toHaveLength(0);
  });
});

describe("parse_showtimes_by_day", () => {
  test("extracts showtimes from cinema divs", () => {
    const html = `
      <html>
        <body>
          <div class="mp-showtimes__day" data-date="0">
            <div class="mp-showtimes__cinema">
              <span class="mp-showtimes__cinema-name">Test Cinema</span>
              <a class="mp-showtimes__time" href="https://tickets.example.com/show1">
                <span class="mp-showtimes__time-value">20:30</span>
              </a>
              <a class="mp-showtimes__time" href="https://tickets.example.com/show2">
                <span class="mp-showtimes__time-value">22:00</span>
              </a>
            </div>
          </div>
        </body>
      </html>
    `;
    const { document } = parseHTML(html);
    const showtimes_by_day = parse_showtimes_by_day(document);

    expect(showtimes_by_day["0"]).toBeDefined();
    expect(showtimes_by_day["0"]["Test Cinema"]).toBeDefined();
    expect(showtimes_by_day["0"]["Test Cinema"].length).toBe(2);
    expect(showtimes_by_day["0"]["Test Cinema"][0].purchase_url).toBe("https://tickets.example.com/show1");
  });

  test("returns empty object when no showtimes found", () => {
    const html = `<html><body><p>No showtimes</p></body></html>`;
    const { document } = parseHTML(html);
    const showtimes_by_day = parse_showtimes_by_day(document);
    expect(showtimes_by_day).toEqual({});
  });

  test("handles multiple cinemas", () => {
    const html = `
      <html>
        <body>
          <div class="mp-showtimes__day" data-date="0">
            <div class="mp-showtimes__cinema">
              <span class="mp-showtimes__cinema-name">Cinema A</span>
              <a class="mp-showtimes__time" href="https://tickets.example.com/a1">
                <span class="mp-showtimes__time-value">18:00</span>
              </a>
            </div>
            <div class="mp-showtimes__cinema">
              <span class="mp-showtimes__cinema-name">Cinema B</span>
              <a class="mp-showtimes__time" href="https://tickets.example.com/b1">
                <span class="mp-showtimes__time-value">19:00</span>
              </a>
            </div>
          </div>
        </body>
      </html>
    `;
    const { document } = parseHTML(html);
    const showtimes_by_day = parse_showtimes_by_day(document);

    expect(showtimes_by_day["0"]).toBeDefined();
    expect(Object.keys(showtimes_by_day["0"])).toHaveLength(2);
    expect(showtimes_by_day["0"]["Cinema A"]).toBeDefined();
    expect(showtimes_by_day["0"]["Cinema B"]).toBeDefined();
  });

  test("parses multiple days", () => {
    const html = `
      <html>
        <body>
          <div class="mp-showtimes__day" data-date="0">
            <div class="mp-showtimes__cinema">
              <span class="mp-showtimes__cinema-name">Cinema A</span>
              <a class="mp-showtimes__time" href="https://tickets.example.com/a1">
                <span class="mp-showtimes__time-value">18:00</span>
              </a>
            </div>
          </div>
          <div class="mp-showtimes__day" data-date="1">
            <div class="mp-showtimes__cinema">
              <span class="mp-showtimes__cinema-name">Cinema A</span>
              <a class="mp-showtimes__time" href="https://tickets.example.com/a2">
                <span class="mp-showtimes__time-value">19:00</span>
              </a>
            </div>
          </div>
        </body>
      </html>
    `;
    const { document } = parseHTML(html);
    const showtimes_by_day = parse_showtimes_by_day(document);

    expect(Object.keys(showtimes_by_day)).toHaveLength(2);
    expect(showtimes_by_day["0"]).toBeDefined();
    expect(showtimes_by_day["1"]).toBeDefined();
  });
});
