import { describe, expect, test } from "vitest";
import { next_radio } from "../src/lib/radio-group";

describe("next_radio", () => {
  test("arrows step to the neighbouring choice", () => {
    expect(next_radio("ArrowRight", 1, 4)).toBe(2);
    expect(next_radio("ArrowDown", 1, 4)).toBe(2);
    expect(next_radio("ArrowLeft", 1, 4)).toBe(0);
    expect(next_radio("ArrowUp", 1, 4)).toBe(0);
  });

  test("arrows wrap at the ends, as native radio buttons do", () => {
    expect(next_radio("ArrowRight", 3, 4)).toBe(0);
    expect(next_radio("ArrowLeft", 0, 4)).toBe(3);
  });

  test("Home and End jump to the first and last choice", () => {
    expect(next_radio("Home", 2, 4)).toBe(0);
    expect(next_radio("End", 1, 4)).toBe(3);
  });

  test("other keys leave the choice alone", () => {
    expect(next_radio("Tab", 1, 4)).toBeUndefined();
    expect(next_radio("a", 1, 4)).toBeUndefined();
  });

  test("an unknown current choice starts from the first", () => {
    expect(next_radio("ArrowRight", -1, 4)).toBe(0);
  });
});
