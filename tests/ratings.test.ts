import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { parse_letterboxd_score, parse_metacritic_scores, parse_rotten_tomatoes_scores } from "../src/lib/parse";

// Full pages saved on 2026-10-02 for "Spider-Man: Brand New Day".
const fixture = (site: string) =>
  new TextDecoder().decode(Bun.gunzipSync(readFileSync(join(__dirname, `fixtures/${site}-spider-man-brand-new-day.html.gz`))));

describe("rating pages", () => {
  test("reads the Tomatometer and Popcornmeter from Rotten Tomatoes", () => {
    expect(parse_rotten_tomatoes_scores(fixture("rottentomatoes"))).toEqual({ score: 90, audience_score: 97 });
  });

  test("keeps a low Tomatometer as a percentage", () => {
    const html = `<script type="application/ld+json">{"@type":"Movie","aggregateRating":{"name":"Tomatometer","ratingValue":"5"}}</script>`;
    expect(parse_rotten_tomatoes_scores(html)).toEqual({ score: 5, audience_score: undefined });
  });

  test("reads the Metascore and user score from Metacritic", () => {
    expect(parse_metacritic_scores(fixture("metacritic"))).toEqual({ score: 66, user_score: 79 });
  });

  test("reads the average rating from Letterboxd", () => {
    expect(parse_letterboxd_score(fixture("letterboxd"))).toEqual({ score: 4 });
  });

  test("returns null when a page has no score", () => {
    expect(parse_rotten_tomatoes_scores("<html></html>")).toBeNull();
    expect(parse_metacritic_scores("<html></html>")).toBeNull();
    expect(parse_letterboxd_score("<html></html>")).toBeNull();
  });
});
