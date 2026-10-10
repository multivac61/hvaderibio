import { expect, test, type Page } from "@playwright/test";

// The phone bar must sit at the bottom of the screen from the first frame,
// whatever the page holds. Anchored to its content instead, it showed at the
// top while the poster grid waited for the browser's clock, or when a choice
// left nothing to list, and then dropped to the bottom.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");
// After the fixture's last showtime, so every day lists nothing.
const FIXTURE_OVER = new Date("2026-10-08T09:00:00Z");

async function bar_gap_to_bottom(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((el) => innerHeight - el.getBoundingClientRect().bottom);
}

async function expect_bar_at_bottom(page: Page, selector: string) {
  const gap = await bar_gap_to_bottom(page, selector);
  // Clear of the edge, so Safari's toolbar is not tinted, and resting 5.5rem
  // below the top of the bar's slot rather than up by the content.
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThan(100);
}

test.describe("before the app starts", () => {
  test.use({ javaScriptEnabled: false });

  test("home page shows the bar at the bottom", async ({ page }) => {
    await page.goto("/");
    await expect_bar_at_bottom(page, "#select-cinemas");
  });

  test("movie page shows the bar at the bottom", async ({ page }) => {
    // Without JavaScript the home page lists no posters to follow.
    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    const [movie] = sitemap.match(/\/movie\/[^<]+/) ?? [];
    expect(movie).toBeDefined();
    await page.goto(movie!);
    await expect_bar_at_bottom(page, "#select-cinemas-movie-mobile");
  });
});

test("home page keeps the bar in place as the posters arrive", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  await expect_bar_at_bottom(page, "#select-cinemas");
});

test("home page keeps the bar at the bottom when nothing is showing", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_OVER);
  await page.goto("/");
  await expect(page.getByText("Prófaðu að velja annan dag")).toBeVisible();
  await expect_bar_at_bottom(page, "#select-cinemas");
});
