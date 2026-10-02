import type { Showtime } from "#lib/schemas.js";
import { reykjavik_date, reykjavik_date_after, reykjavik_hours } from "#lib/reykjavik.js";

// Late at night keep the evening's later showtimes listed rather than none.
const LATEST_TODAY_CUTOFF_HOUR = 21;

/**
 * Whether a showtime belongs to the selected day, counted from `now` in
 * Reykjavik. Days are matched by date rather than by the scraper's day buckets,
 * which go stale when the catalog was scraped before midnight.
 */
export const is_visible_showtime = (showtime: Showtime, selected_day: string, now: Date) => {
  if (reykjavik_date(showtime.time) !== reykjavik_date_after(now, Number(selected_day))) return false;
  if (selected_day !== "0") return true;

  return reykjavik_hours(showtime.time) >= Math.min(LATEST_TODAY_CUTOFF_HOUR, Math.floor(reykjavik_hours(now)));
};

const get_showtime_key = (showtime: Showtime) => `${showtime.time}-${showtime.purchase_url}`;

export const get_visible_showtimes = (showtimes: readonly Showtime[], selected_day: string, now: Date) => {
  const seen = new Set<string>();

  return showtimes.filter((showtime) => {
    if (!is_visible_showtime(showtime, selected_day, now)) return false;

    const key = get_showtime_key(showtime);
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};
