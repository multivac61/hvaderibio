// Showtimes are Icelandic wall-clock times. Iceland stays on UTC+0 all year,
// but naming the zone keeps visitors abroad on Icelandic days and hours.
const time_zone = "Atlantic/Reykjavik";

const date_format = new Intl.DateTimeFormat("en-CA", { timeZone: time_zone }); // YYYY-MM-DD
const time_format = new Intl.DateTimeFormat("en-GB", { timeZone: time_zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const DAY_MS = 24 * 60 * 60 * 1000;

export const reykjavik_date = (instant: Date | string) => date_format.format(new Date(instant));

export const reykjavik_time = (instant: Date | string) => time_format.format(new Date(instant));

export const reykjavik_hours = (instant: Date | string) => {
  const [hours, minutes] = reykjavik_time(instant).split(":").map(Number);
  return hours + minutes / 60;
};

/** The Reykjavik date `offset` days after `now`; safe because Iceland has no DST. */
export const reykjavik_date_after = (now: Date, offset: number) => reykjavik_date(new Date(now.getTime() + offset * DAY_MS));
