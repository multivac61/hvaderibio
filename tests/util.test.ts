import { describe, expect, test } from "bun:test";
import { group_by, to_hhmm } from "../src/lib/util";

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
