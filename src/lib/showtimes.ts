import type { Showtime } from "#lib/schemas.js";
import { reykjavik_date, reykjavik_date_after, reykjavik_hours } from "#lib/reykjavik.js";

// Late at night keep the evening's later showtimes listed rather than none.
const LATEST_TODAY_CUTOFF_HOUR = 21;

/**
 * Whether a showtime at `time` belongs to the selected day, counted from `now` in
 * Reykjavik. Days are matched by date rather than by the scraper's day buckets,
 * which go stale when the catalog was scraped before midnight.
 */
export const is_visible_time = (time: string, selected_day: string, now: Date) => {
  if (reykjavik_date(time) !== reykjavik_date_after(now, Number(selected_day))) return false;
  if (selected_day !== "0") return true;

  return reykjavik_hours(time) >= Math.min(LATEST_TODAY_CUTOFF_HOUR, Math.floor(reykjavik_hours(now)));
};

/** Drop repeated listings of the same screening (same time and ticket link). */
export const unique_showtimes = (showtimes: readonly Showtime[]) => {
  const seen = new Set<string>();
  return showtimes.filter(({ time, purchase_url }) => {
    const key = `${time}-${purchase_url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const get_visible_showtimes = (showtimes: readonly Showtime[], selected_day: string, now: Date) =>
  unique_showtimes(showtimes).filter((showtime) => is_visible_time(showtime.time, selected_day, now));
