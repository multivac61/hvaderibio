import { devices, expect, test, type Page } from "@playwright/test";

// How the pages move: what fades in, and when, on phones and desktops.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

// Watch, every frame from the first paint, the lowest opacity shown by any
// visible element matching each selector, counting its ancestors' opacity.
async function watch_opacity(page: Page, selectors: Record<string, string>) {
  await page.addInitScript((selectors) => {
    const lowest: Record<string, number> = {};
    Object.assign(window, { lowest_opacity: lowest });
    const sample = () => {
      for (const [name, selector] of Object.entries(selectors)) {
        for (const el of document.querySelectorAll(selector)) {
          if (!el.checkVisibility()) continue;
          let opacity = 1;
          for (let node: Element | null = el; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
          lowest[name] = Math.min(lowest[name] ?? 1, opacity);
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, selectors);
}

const lowest_opacity = (page: Page) =>
  page.evaluate(() => (window as unknown as { lowest_opacity: Record<string, number> }).lowest_opacity);
const forget_opacity = (page: Page) =>
  page.evaluate(() => {
    const lowest = (window as unknown as { lowest_opacity: Record<string, number> }).lowest_opacity;
    for (const name of Object.keys(lowest)) delete lowest[name];
  });

const app_started = (page: Page) => expect(page.getByRole("status")).toHaveText(/myndir?$/);

// The posters the home page lists, in order, as prerendered.
async function prerendered_ids(page: Page) {
  const static_page = await page.context().browser()!.newPage({ javaScriptEnabled: false });
  await static_page.goto(new URL("/", page.url() === "about:blank" ? "http://localhost:4173" : page.url()).href);
  const ids = await static_page.locator("a[data-movie-id]").evaluateAll((links) => links.map((a) => a.getAttribute("data-movie-id")!));
  await static_page.close();
  return ids;
}

test("phone: opening a movie fades its trailer in, as it does a poster", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await watch_opacity(page, { trailer: "a[aria-label='Spila stiklu']" });
  await page.goto("/");
  await app_started(page);
  await page
    .locator("a[data-movie-id]")
    .filter({ has: page.getByAltText("Verity", { exact: true }) })
    .tap();
  await expect(page.getByRole("heading", { name: "Verity" })).toBeVisible();
  await page.waitForTimeout(600);
  const { trailer } = await lowest_opacity(page);
  expect(trailer).toBeLessThan(1);
});

// A page opened directly arrives prerendered; nothing on it fades in again
// once the app starts.
for (const path of ["/movie/verity", "/"]) {
  test(`phone: ${path} shows at once when opened directly`, async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MORNING);
    await watch_opacity(page, {
      trailer: "a[aria-label='Spila stiklu']",
      poster: ".poster-card",
      programme: "[data-day-programme]",
    });
    await page.goto(path);
    await expect(page.getByRole("status")).not.toBeEmpty();
    await page.waitForTimeout(600);
    const lowest = await lowest_opacity(page);
    expect(Object.values(lowest).filter((opacity) => opacity < 1)).toEqual([]);
  });
}

test("phone: changing the day fades the showtimes in", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await watch_opacity(page, { programme: "[data-day-programme]" });
  await page.goto("/movie/verity");
  await page.waitForTimeout(300);
  await forget_opacity(page);
  await page.getByRole("radio", { name: "þriðjudag" }).filter({ visible: true }).click();
  await page.waitForTimeout(600);
  const { programme } = await lowest_opacity(page);
  expect(programme).toBeLessThan(1);
  await expect(page.locator("[data-day-programme]")).toHaveCSS("opacity", "1");
});

// Desktops already cross-fade the change as a view transition; a fade of
// its own on top would leave the new showtimes faint as it ends.
test("desktop: changing the day leaves the fade to the view transition", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Safari"], baseURL });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await watch_opacity(page, { programme: "[data-day-programme]" });
  await page.goto("/movie/verity");
  await page.waitForTimeout(300);
  await forget_opacity(page);
  await page.getByRole("radio", { name: "þriðjudag" }).filter({ visible: true }).click();
  await page.waitForTimeout(600);
  const { programme } = await lowest_opacity(page);
  await context.close();
  expect(programme ?? 1).toBe(1);
});

test.describe("asking for less motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  // The bar only fades, never moves, so it still fades.
  test("the floating bar still fades in", async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MORNING);
    await page.addInitScript(() => {
      const seen: number[] = [];
      Object.assign(window, { bar_opacity: seen });
      const sample = () => {
        const bar = document.querySelector("#select-cinemas")?.closest("[data-floating-bar]");
        if (bar) seen.push(Number(getComputedStyle(bar).opacity));
        if (seen.at(-1) !== 1 && performance.now() < 20_000) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => (window as unknown as { bar_opacity: number[] }).bar_opacity.at(-1))).toBe(1);
    const seen = await page.evaluate(() => (window as unknown as { bar_opacity: number[] }).bar_opacity);
    expect(seen.some((opacity) => opacity > 0 && opacity < 1)).toBe(true);
  });
});

// Scrolling down to read hides the bar promptly; bringing it back is the
// visitor's choice and eases in at the usual pace.
test("the floating bar hides quicker than it shows", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await app_started(page);
  const bar = page.locator("[data-floating-bar]").filter({ has: page.locator("#select-cinemas") });
  await expect(bar).toHaveCSS("opacity", "1");
  const showing = await bar.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  await page.evaluate(() => scrollBy(0, 600));
  await expect(bar).toHaveCSS("opacity", "0");
  const hiding = await bar.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(hiding).toBeLessThan(showing);
});

// Like the trailer thumbnail: a poster further down, still on its way,
// waits in its dark box and fades in whole. Those on the first screen, and
// any the browser already has, show at once.
test("phone: posters below the first screen fade in once loaded", async ({ page }) => {
  const ids = await prerendered_ids(page);
  const lazy = ids[8]!;
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(new RegExp(`/${lazy}(-\\d+w)?\\.webp$`), async (route) => {
    await held;
    await route.continue();
  });
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await watch_opacity(page, { first_screen: `a[data-movie-id="${ids[0]}"] img` });
  // The held poster would keep the load event from ever firing.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await app_started(page);

  const poster = page.locator(`a[data-movie-id="${lazy}"] img`);
  await poster.scrollIntoViewIfNeeded();
  await expect(poster).toHaveCSS("opacity", "0");
  release();
  await expect(poster).toHaveCSS("opacity", "1");
  expect((await lowest_opacity(page)).first_screen).toBe(1);
});

test("phone: coming back from a movie shows its posters at once", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await watch_opacity(page, { posters: "a[data-movie-id] img" });
  await page.goto("/");
  await app_started(page);
  // Load every poster first, as a visitor scrolling through would.
  for (const poster of await page.locator("a[data-movie-id] img").all()) await poster.scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.locator("a[data-movie-id] img").evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).complete)))
    .toBe(true);
  await page.locator("a[data-movie-id]").last().tap();
  await page.waitForURL(/\/movie\//);
  await forget_opacity(page);
  await page.goBack();
  await app_started(page);
  await page.waitForTimeout(600);
  expect((await lowest_opacity(page)).posters ?? 1).toBe(1);
});
