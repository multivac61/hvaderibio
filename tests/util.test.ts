import { describe, expect, test } from "bun:test";
import { group_by, in_range, to_hhmm, to_float } from "../src/lib/util";

describe("group_by", () => {
  test("groups objects by key", () => {
    const items = [
      { category: "a", value: 1 },
      { category: "b", value: 2 },
      { category: "a", value: 3 },
    ];
    const result = group_by(items, "category");
    expect(result).toEqual({
      a: [
        { category: "a", value: 1 },
        { category: "a", value: 3 },
      ],
      b: [{ category: "b", value: 2 }],
    });
  });

  test("returns empty object for empty array", () => {
    const result = group_by([], "key");
    expect(result).toEqual({});
  });
});

describe("in_range", () => {
  test("returns true when value is in range", () => {
    expect(in_range(5, 1, 10)).toBe(true);
    expect(in_range(1, 1, 10)).toBe(true);
    expect(in_range(10, 1, 10)).toBe(true);
  });

  test("returns false when value is outside range", () => {
    expect(in_range(0, 1, 10)).toBe(false);
    expect(in_range(11, 1, 10)).toBe(false);
  });

  test("handles time ranges correctly", () => {
    expect(in_range(21.5, 21, 24)).toBe(true);
    expect(in_range(20.5, 21, 24)).toBe(false);
  });
});

describe("to_hhmm", () => {
  test("formats whole hours correctly", () => {
    expect(to_hhmm(14)).toBe("14:00");
    expect(to_hhmm(21)).toBe("21:00");
    expect(to_hhmm(0)).toBe("0:00");
  });

  test("formats half hours correctly", () => {
    expect(to_hhmm(14.5)).toBe("14:30");
    expect(to_hhmm(21.5)).toBe("21:30");
  });

  test("formats quarter hours correctly", () => {
    expect(to_hhmm(14.25)).toBe("14:15");
    expect(to_hhmm(14.75)).toBe("14:45");
  });

  test("handles edge cases", () => {
    expect(to_hhmm(23.99)).toBe("23:59");
    expect(to_hhmm(0.5)).toBe("0:30");
  });
});

describe("to_float", () => {
  test("converts ISO date string to float time", () => {
    const date = new Date();
    date.setHours(14, 30, 0, 0);
    const result = to_float(date.toISOString());
    expect(result).toBe(14.5);
  });

  test("handles midnight", () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const result = to_float(date.toISOString());
    expect(result).toBe(0);
  });

  test("handles end of day", () => {
    const date = new Date();
    date.setHours(23, 59, 0, 0);
    const result = to_float(date.toISOString());
    expect(result).toBeCloseTo(23.983, 2);
  });
});
