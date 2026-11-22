import { expect, test, type Page } from "@playwright/test";

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
