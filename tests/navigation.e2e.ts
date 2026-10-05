import { expect, test } from "@playwright/test";

// An edge swipe back in iOS Safari animates to a screenshot of the previous
// page, then hands over to SvelteKit. If SvelteKit still has to fetch that
// page's data, the page being left shows again until the fetch returns: a
// glitch the length of a round trip on a phone network.
test("going back from a movie shows the home page without waiting on the network", async ({ page }) => {
  await page.route("**/__data.json*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });

  await page.goto("/");
  // Tap a poster where it is; a locator tap would scroll it into view first.
  const viewport = page.viewportSize()!;
  await page.touchscreen.tap(viewport.width / 4, viewport.height / 2);
  await page.waitForURL(/\/movie\//);
  // A visitor reads the movie page for a moment before swiping back.
  await page.waitForTimeout(1000);

  const shown_after = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        addEventListener("popstate", () => {
          const start = performance.now();
          const check = () =>
            document.querySelector("[data-movie-id]") ? resolve(performance.now() - start) : requestAnimationFrame(check);
          check();
        });
        history.back();
      })
  );
  expect(shown_after).toBeLessThan(100);
});
