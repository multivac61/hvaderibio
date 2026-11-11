import { expect, test } from "@playwright/test";

// Layout at the edges of the range of screens: the narrowest phones, the
// tablet widths where the desktop header first shows, and fingers rather
// than a mouse.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

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
});
