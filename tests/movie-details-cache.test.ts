import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { load_movie_details } from "../src/lib/movie-details-cache";
import type { MovieDetails } from "../src/lib/parse";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "details-"));
});
afterAll(() => rm(dir, { recursive: true, force: true }));

const details = (id: number, title = `Movie ${id}`): MovieDetails => ({
  id,
  title,
  release_year: 2026,
  poster_url: `https://example.com/${id}.jpg`,
  description: "",
  genres: [],
  duration_in_mins: 90,
  language: [],
});

describe("load_movie_details", () => {
  test("fetches only movies whose details are missing or stale", async () => {
    const cache_path = join(dir, "movie-details.json");
    const fetched: number[] = [];
    const fetch_details = async (id: number) => {
      fetched.push(id);
      return details(id, `Movie ${id} v${fetched.length}`);
    };
    const day = 24 * 60 * 60 * 1000;
    const t0 = new Date("2026-10-02T12:00:00Z");

    await load_movie_details([1, 2], fetch_details, { cache_path, now: t0, max_age_ms: day });
    expect(fetched).toEqual([1, 2]);

    const second = await load_movie_details([1, 2, 3], fetch_details, {
      cache_path,
      now: new Date(t0.getTime() + day / 2),
      max_age_ms: day,
    });
    expect(fetched).toEqual([1, 2, 3]);
    expect(second.get(1)?.title).toBe("Movie 1 v1");

    const third = await load_movie_details([1, 3], fetch_details, { cache_path, now: new Date(t0.getTime() + day + 1), max_age_ms: day });
    expect(fetched).toEqual([1, 2, 3, 1]);
    expect(third.get(1)?.title).toBe("Movie 1 v4");
    expect([...third.keys()].sort()).toEqual([1, 3]);
  });

  test("keeps cached details when a refresh fails, and omits movies never fetched", async () => {
    const cache_path = join(dir, "failing.json");
    const day = 24 * 60 * 60 * 1000;
    const t0 = new Date("2026-10-02T12:00:00Z");
    await load_movie_details([1], async (id) => details(id), { cache_path, now: t0, max_age_ms: day });

    const result = await load_movie_details([1, 2], async () => null, {
      cache_path,
      now: new Date(t0.getTime() + 2 * day),
      max_age_ms: day,
    });

    expect(result.get(1)?.title).toBe("Movie 1");
    expect(result.has(2)).toBe(false);
  });
});
