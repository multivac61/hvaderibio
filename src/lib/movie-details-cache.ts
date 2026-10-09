import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { map_concurrent } from "#lib/concurrency.js";
import { movie_details_schema, type MovieDetails } from "#lib/schemas.js";

type CacheEntry = { fetched_at: string; details: MovieDetails };

// The cache outlives code changes, so re-validate every entry: fields the
// schema no longer has are dropped, and entries that no longer parse are
// treated as missing and fetched again.
async function read_cache(path: string): Promise<Record<string, CacheEntry>> {
  let raw: Record<string, { fetched_at?: unknown; details?: unknown }>;
  try {
    raw = JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return {};
  }
  const cache: Record<string, CacheEntry> = {};
  for (const [id, entry] of Object.entries(raw)) {
    const details = movie_details_schema.safeParse(entry?.details);
    if (details.success && typeof entry.fetched_at === "string") cache[id] = { fetched_at: entry.fetched_at, details: details.data };
  }
  return cache;
}

/**
 * Details for each listed movie, fetching a movie's page only when it is new
 * or its cached details are older than `max_age_ms`. Movie pages are slow to
 * generate and their content rarely changes, while showtimes come from the
 * listings on every run. A failed refresh keeps the cached details; a movie
 * that was never fetched successfully is omitted.
 */
export async function load_movie_details(
  ids: readonly number[],
  fetch_details: (id: number) => Promise<MovieDetails | null>,
  {
    cache_path,
    now = new Date(),
    max_age_ms,
    concurrency = 4,
  }: { cache_path: string; now?: Date; max_age_ms: number; concurrency?: number }
): Promise<Map<number, MovieDetails>> {
  const cache = await read_cache(cache_path);
  const is_fresh = (id: number) => {
    const entry = cache[id];
    return entry !== undefined && now.getTime() - Date.parse(entry.fetched_at) <= max_age_ms;
  };

  const stale = ids.filter((id) => !is_fresh(id));
  await map_concurrent(stale, concurrency, async (id) => {
    const details = await fetch_details(id);
    if (details) cache[id] = { fetched_at: now.toISOString(), details };
  });

  const listed = ids.filter((id) => cache[id] !== undefined);
  await mkdir(dirname(cache_path), { recursive: true });
  await writeFile(cache_path, JSON.stringify(Object.fromEntries(listed.map((id) => [id, cache[id]])), null, 2));

  console.log(`Movie details: ${stale.length} fetched, ${ids.length - stale.length} cached`);
  return new Map(listed.map((id) => [id, cache[id].details]));
}
