import { devices, expect, test } from "@playwright/test";

// The fixture's day, so the home page has posters once the app starts.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

// Choosing a cinema animates the grid: posters showing in both selections
// slide to their new places rather than the whole grid being swapped in one
// frame. (A day changes with the panel still open over the grid, and
// cross-fades instead; see picker-surfaces.)
test("desktop: posters slide to their places when the cinema changes", async ({ browser, baseURL }) => {
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
  await page.locator("#select-cinemas-desktop").click();
  // A click lands only once the panel has grown out of the pill: until then
  // its rows lie outside the growing clip, and a click there misses them.
  await expect.poll(() => page.locator(".programme-panel").evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.getByRole("radio", { name: "Öll", exact: true }).click();
  await expect(page.locator("#select-cinemas-desktop")).toContainText("Öll");

  await expect
    .poll(() => page.evaluate(() => [...(window as unknown as { animated: Set<string> }).animated]))
    .toContain(`::view-transition-group(poster-${poster})`);
  await context.close();
});

// A cinema clicked puts the panel away, and only then do the posters move.
// Played together, the panel shrank inside the transition: the day row, on
// a layer of its own, stood outside the shrinking clip, and the panel's
// frosting stayed the size of the open panel. It looked like the panel
// closing and opening again.
test("desktop: the panel is away before the posters move", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
  await page.locator("#select-cinemas-desktop").click();
  await expect.poll(() => page.locator(".programme-panel").evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.evaluate(() => {
    const record = window as unknown as { overlapped: boolean; transitioned: boolean };
    record.overlapped = false;
    record.transitioned = false;
    const look = () => {
      if (document.documentElement.matches(":active-view-transition")) {
        record.transitioned = true;
        if (document.querySelector(".programme-panel")) record.overlapped = true;
      }
      requestAnimationFrame(look);
    };
    look();
  });
  await page.getByRole("radio", { name: "Öll", exact: true }).click();
  await expect(page.locator("#select-cinemas-desktop")).toContainText("Öll");
  await page.waitForTimeout(400);
  const record = await page.evaluate(() => {
    const { overlapped, transitioned } = window as unknown as { overlapped: boolean; transitioned: boolean };
    return { overlapped, transitioned };
  });
  expect(record.transitioned).toBe(true);
  expect(record.overlapped).toBe(false);
  await context.close();
});

// While a change plays as a view transition, the next click still counts:
// the transition's snapshot lay over the page and took every click for a
// quarter of a second, so a second day clicked just after the first was
// lost.
test("desktop: a click during the slide still chooses", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
  await page.locator("#select-cinemas-desktop").click();
  await expect.poll(() => page.locator(".programme-panel").evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  // Raw clicks, 80ms apart: Playwright's own click waits for the page to
  // settle, which hid the loss.
  const centre = async (name: string) => {
    const box = (await page.getByRole("radio", { name, exact: true }).boundingBox())!;
    return [box.x + box.width / 2, box.y + box.height / 2] as const;
  };
  const tomorrow = await centre("Á morgun");
  const tuesday = await centre("Þriðjudag");
  await page.mouse.click(...tomorrow);
  await page.waitForTimeout(80);
  await page.mouse.click(...tuesday);
  await expect(page.getByRole("radio", { name: "Þriðjudag", exact: true })).toBeChecked();
  await context.close();
});

// Choosing what is already chosen changes nothing, so nothing plays: it
// still started a transition, which held up the clicks that followed.
test("desktop: choosing the chosen day plays no transition", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
  await page.evaluate(() => {
    const record = window as unknown as { transitions: number };
    record.transitions = 0;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((...args: Parameters<typeof start>) => {
      record.transitions++;
      return start(...args);
    }) as typeof document.startViewTransition;
  });
  await page.locator("#select-cinemas-desktop").click();
  await expect.poll(() => page.locator(".programme-panel").evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.getByRole("radio", { name: "Í dag", exact: true }).click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { transitions: number }).transitions)).toBe(0);
  await context.close();
});
