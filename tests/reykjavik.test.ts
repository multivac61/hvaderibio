import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { get_day_label } from "../src/lib/day-picker";
import { reykjavik_date, reykjavik_hours, reykjavik_time } from "../src/lib/reykjavik";

// A timezone far from Iceland's UTC+0 exposes any use of the visitor's clock.
let original_tz: string | undefined;
beforeAll(() => {
  original_tz = process.env.TZ;
  process.env.TZ = "Pacific/Auckland";
});
afterAll(() => {
  process.env.TZ = original_tz;
});

describe("reykjavik time", () => {
  test("formats showtimes in Icelandic wall-clock time", () => {
    expect(reykjavik_time("2026-09-03T20:20:00.000Z")).toBe("20:20");
    expect(reykjavik_time("2026-09-03T09:05:00.000Z")).toBe("09:05");
    expect(reykjavik_time("2026-09-03T00:00:00.000Z")).toBe("00:00");
  });

  test("returns the Icelandic calendar date", () => {
    expect(reykjavik_date("2026-09-03T23:59:00.000Z")).toBe("2026-09-03");
    expect(reykjavik_date(new Date("2026-09-04T00:01:00.000Z"))).toBe("2026-09-04");
  });

  test("returns fractional Icelandic hours", () => {
    expect(reykjavik_hours("2026-09-03T14:30:00.000Z")).toBe(14.5);
    expect(reykjavik_hours("2026-09-03T00:00:00.000Z")).toBe(0);
  });

  test("labels days by Icelandic weekday", () => {
    // Thursday 3 September in Reykjavik, already Friday in Auckland.
    const now = new Date("2026-09-03T20:00:00.000Z");
    expect(get_day_label("0", now)).toBe("í dag");
    expect(get_day_label("1", now)).toBe("á morgun");
    expect(get_day_label("2", now)).toBe("laugardag");
    expect(get_day_label("3", now)).toBe("sunnudag");
  });
});
