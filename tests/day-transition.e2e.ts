import { devices, expect, test } from "@playwright/test";

// The fixture's day, so the home page has posters once the app starts.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

// Switching day animates the grid: posters showing on both days slide to
// their new places rather than the whole grid being swapped in one frame.
test("desktop: posters slide to their places when the day changes", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
  const poster = await page.locator("a[data-movie-id]").first().getAttribute("data-movie-id");

  // Record the poster groups the browser animates.
  await page.evaluate(() => {
    const seen = new Set<string>();
    (window as unknown as { animated: Set<string> }).animated = seen;
    const watch = () => {
      for (const animation of document.getAnimations()) {
        const pseudo = (animation.effect as KeyframeEffect | null)?.pseudoElement;
        if (pseudo) seen.add(pseudo);
      }
      requestAnimationFrame(watch);
    };
    watch();
  });
  await page.getByRole("button", { name: "á morgun" }).filter({ visible: true }).click();
  await expect(page.getByRole("button", { name: "á morgun" }).filter({ visible: true })).toHaveAttribute("aria-pressed", "true");

  await expect
    .poll(() => page.evaluate(() => [...(window as unknown as { animated: Set<string> }).animated]))
    .toContain(`::view-transition-group(poster-${poster})`);
  await context.close();
});
