import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import { parse_movie_ids, parse_showtimes_by_day } from "../src/lib/parse";

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

describe("parse_showtimes_by_day", () => {
  test("extracts showtimes from cinema divs", () => {
    const html = `
      <html>
        <body>
          <div class="times_day day0">
            <div class="biotimar">
              <h3>Test Cinema</h3>
              <ul>
                <li class="qtip tip-top">
                  <a class="rate" href="https://tickets.example.com/show1">20.30</a>
                  <div class="salur">Hall 1</div>
                </li>
                <li class="qtip tip-top">
                  <a class="rate" href="https://tickets.example.com/show2">22.00</a>
                  <div class="salur">Hall 2</div>
                </li>
              </ul>
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
    expect(showtimes_by_day["0"]["Test Cinema"][0].hall).toBe("Hall 1");
    expect(showtimes_by_day["0"]["Test Cinema"][0].purchase_url).toBe("https://tickets.example.com/show1");
    expect(showtimes_by_day["0"]["Test Cinema"][1].hall).toBe("Hall 2");
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
          <div class="times_day day0">
            <div class="biotimar">
              <h3>Cinema A</h3>
              <ul>
                <li class="qtip tip-top">
                  <a class="rate" href="https://tickets.example.com/a1">18.00</a>
                  <div class="salur">Hall A</div>
                </li>
              </ul>
            </div>
            <div class="biotimar">
              <h3>Cinema B</h3>
              <ul>
                <li class="qtip tip-top">
                  <a class="rate" href="https://tickets.example.com/b1">19.00</a>
                  <div class="salur">Hall B</div>
                </li>
              </ul>
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
          <div class="times_day day0">
            <div class="biotimar">
              <h3>Cinema A</h3>
              <ul>
                <li class="qtip tip-top">
                  <a class="rate" href="https://tickets.example.com/a1">18.00</a>
                  <div class="salur">Hall A</div>
                </li>
              </ul>
            </div>
          </div>
          <div class="times_day day1">
            <div class="biotimar">
              <h3>Cinema A</h3>
              <ul>
                <li class="qtip tip-top">
                  <a class="rate" href="https://tickets.example.com/a2">19.00</a>
                  <div class="salur">Hall A</div>
                </li>
              </ul>
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
