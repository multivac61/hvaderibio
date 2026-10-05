import { expect, test, type Page } from "@playwright/test";

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

// The bar's opacity, ancestors included, in the first frame it shows up in.
const opacity_on_arrival = (page: Page, selector: string) =>
  page.evaluate(
    (selector) =>
      new Promise<number>((resolve) => {
        const check = () => {
          const bar = document.querySelector(selector);
          if (!bar) return void requestAnimationFrame(check);
          let opacity = 1;
          for (let node: Element | null = bar; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
          resolve(opacity);
        };
        requestAnimationFrame(check);
      }),
    selector
  );

// The floating day and cinema bar is the same control on every page; it
// should stay put across a navigation rather than blink out and fade in.
test("the floating controls stay visible across navigations", async ({ page }) => {
  await page.goto("/");
  const viewport = page.viewportSize()!;

  const on_movie = opacity_on_arrival(page, "#select-cinemas-movie-mobile");
  await page.touchscreen.tap(viewport.width / 4, viewport.height / 2);
  expect(await on_movie).toBe(1);

  const back_home = opacity_on_arrival(page, "#select-cinemas");
  await page.goBack();
  expect(await back_home).toBe(1);
});
