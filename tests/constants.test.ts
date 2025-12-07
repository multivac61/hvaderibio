import { describe, expect, test } from "bun:test";
import { CAPITAL_REGION_CINEMAS } from "../src/lib/constants";

describe("CAPITAL_REGION_CINEMAS", () => {
  test("contains expected cinemas", () => {
    expect(CAPITAL_REGION_CINEMAS).toContain("Bíó Paradís");
    expect(CAPITAL_REGION_CINEMAS).toContain("Háskólabíó");
    expect(CAPITAL_REGION_CINEMAS).toContain("Smárabíó");
  });

  test("has correct number of cinemas", () => {
    expect(CAPITAL_REGION_CINEMAS.length).toBe(7);
  });

  test("is readonly", () => {
    // TypeScript should enforce this, but we can check the values are as expected
    const cinemas = [...CAPITAL_REGION_CINEMAS];
    expect(cinemas).toEqual([
      "Bíó Paradís",
      "Háskólabíó",
      "Laugarásbíó",
      "Sambíóin Egilshöll",
      "Sambíóin Kringlunni",
      "Sambíóin Álfabakka",
      "Smárabíó",
    ]);
  });
});
