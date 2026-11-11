import { expect, test } from "@playwright/test";

// Layout at the edges of the range of screens: the narrowest phones, the
// tablet widths where the desktop header first shows, and fingers rather
// than a mouse.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");
// A Monday, so the picker carries its two longest labels, "miðvikudag" and
// "fimmtudag".
const FIXTURE_MONDAY = new Date("2026-10-05T09:00:00Z");

test.describe("320px phone", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  // Two posters did not fit side by side, so the grid fell to one column of
  // posters taller than the screen.
  test("posters stay two to a row", async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MORNING);
    await page.goto("/");
    const posters = page.locator('a[href^="/movie/"]');
    await expect(posters.first()).toBeVisible();
    const [first, second] = await Promise.all([posters.nth(0).boundingBox(), posters.nth(1).boundingBox()]);
    expect(second!.y).toBe(first!.y);
    expect(second!.x).toBeGreaterThan(first!.x);
  });

  // The labels broke onto two lines, "á / morgun", doubling the bar's height.
  test("day labels stay on one line, inside the screen", async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MONDAY);
    await page.goto("/");
    const days = page.locator("[data-floating-bar] button");
    await expect(days.first()).toBeVisible();
    const boxes = await days.evaluateAll((buttons) =>
      buttons.map((button) => {
        const range = document.createRange();
        range.selectNodeContents(button);
        const { left, right } = button.getBoundingClientRect();
        return { lines: new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size, left, right };
      })
    );
    expect(boxes).toHaveLength(4);
    for (const { lines, left, right } of boxes) {
      expect(lines).toBe(1);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(320);
    }
  });
});

test.describe("768px tablet", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  // Centred in a row too narrow for them, the tabs overflowed both ways, and
  // a scroller cannot reach what overflows to the left: "Allt" was cut off.
  test("the first cinema tab can be reached", async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MORNING);
    await page.goto("/");
    const first_tab = page.getByRole("button", { name: "Allt", exact: true });
    await expect(first_tab).toBeVisible();
    const { tab_left, strip_left } = await first_tab.evaluate((tab) => {
      const strip = tab.parentElement!;
      strip.scrollLeft = 0;
      return { tab_left: tab.getBoundingClientRect().left, strip_left: strip.getBoundingClientRect().left };
    });
    expect(tab_left).toBeGreaterThanOrEqual(strip_left);
  });
});
