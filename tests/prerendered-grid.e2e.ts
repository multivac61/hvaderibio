import { devices, expect, test, type Browser, type Page } from "@playwright/test";

// The home page arrives with today's posters already in it, ordered by the
// build's clock (pinned to FIXTURE_MORNING in playwright.config.ts), so the
// largest paint does not wait for the app. The app then re-sorts by the
// visitor's clock without tearing the grid down.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");
// The family matinées have ended by then, and the evening films lead.
const FIXTURE_AFTERNOON = new Date("2026-10-03T16:00:00Z");

const poster_titles = (page: Page) =>
  page.locator("a[data-movie-id] img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt")));

// The status line is written by the app once it knows the time.
const app_started = (page: Page) => expect(page.getByRole("status")).toHaveText(/myndir?$/);

const prerendered_titles = async (browser: Browser) => {
  const static_page = await browser.newPage({ javaScriptEnabled: false });
  await static_page.goto("/");
  const titles = await poster_titles(static_page);
  await static_page.close();
  return titles;
};

test.describe("before the app starts", () => {
  test.use({ javaScriptEnabled: false });

  test("home page lists today's posters", async ({ page }) => {
    await page.goto("/");
    const posters = page.locator("a[data-movie-id] img");
    await expect(posters).toHaveCount(12);
    // The first poster is the largest paint; the rest give way to it.
    await expect(posters.first()).toHaveAttribute("fetchpriority", "high");
    await expect(posters.nth(1)).toHaveAttribute("fetchpriority", "low");
  });
});

// Posters on the first screen load with the page; the rest wait until
// scrolled near, so they do not compete with the ones on screen. One cutoff
// serves every grid width, so check it at both ends.
for (const [screen, device] of [
  ["phone", devices["iPhone 15"]],
  ["desktop", devices["Desktop Safari"]],
] as const) {
  test(`${screen}: posters on the first screen load eagerly, the rest lazily`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ ...device, baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    const posters = await page
      .locator("a[data-movie-id] img")
      .evaluateAll((imgs) => imgs.map((img) => ({ loading: img.getAttribute("loading"), top: img.getBoundingClientRect().top })));
    await context.close();

    const on_screen = posters.filter(({ top }) => top < device.viewport.height);
    const below = posters.filter(({ top }) => top >= 2 * device.viewport.height);
    expect(on_screen.length).toBeGreaterThan(0);
    expect(on_screen.map(({ loading }) => loading)).toEqual(on_screen.map(() => "eager"));
    // Two screens down nothing should be fetched up front.
    expect(below.length).toBeGreaterThan(0);
    expect(below.map(({ loading }) => loading)).toEqual(below.map(() => "lazy"));
  });
}

test("posters stay put when the app starts at the build's time", async ({ page, browser }) => {
  const prerendered = await prerendered_titles(browser);

  const errors: string[] = [];
  // Hydration mismatches are reported from the app's own scripts; third-party
  // analytics may be unreachable where the tests run.
  page.on("console", (message) => {
    const own = message.location().url.startsWith("http://localhost");
    if (own && (message.type() === "error" || message.type() === "warning")) errors.push(message.text());
  });
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await app_started(page);
  expect(await poster_titles(page)).toEqual(prerendered);
  expect(errors).toEqual([]);
});

test("the app drops films that have ended since the build, keeping the order", async ({ page, browser }) => {
  const prerendered = await prerendered_titles(browser);
  await page.clock.setFixedTime(FIXTURE_AFTERNOON);
  await page.goto("/");
  await app_started(page);
  // The matinées are over; a fresh sort would also reorder the rest.
  const ended = ["Hvolpasveitin: Risaeðlumyndin", "Shaun the Sheep: The Beast of Mossy Bottom", "Gæludýralestin"];
  await expect.poll(() => poster_titles(page)).toEqual(prerendered.filter((title) => !ended.includes(title!)));
});

test("the grid only changes while it is blurred out of sight", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_AFTERNOON);
  // Sample every frame from the first paint, before the app starts.
  await page.addInitScript(() => {
    const frames: { changed: boolean; opacity: number }[] = [];
    Object.assign(window, { frames_seen: frames });
    let first: string | undefined;
    const sample = () => {
      const grid = document.querySelector("a[data-movie-id]")?.parentElement;
      if (grid) {
        const order = [...grid.querySelectorAll("a[data-movie-id]")].map((a) => a.getAttribute("data-movie-id")).join();
        first ??= order;
        frames.push({ changed: order !== first, opacity: Number(getComputedStyle(grid).opacity) });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto("/");
  await app_started(page);
  await page.waitForTimeout(1500);
  const frames = await page.evaluate(() => (window as unknown as { frames_seen: { changed: boolean; opacity: number }[] }).frames_seen);
  const first_changed = frames.findIndex((f) => f.changed);
  expect(first_changed).toBeGreaterThan(0);
  expect(frames[first_changed - 1]!.opacity).toBe(0);
  expect(frames[first_changed]!.opacity).toBe(0);
  expect(frames.at(-1)!.opacity).toBe(1);
});

test("coming back from a movie shows the chosen day at once, without a blur", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  // Record the grid's opacity and posters every frame, across navigations.
  await page.addInitScript(() => {
    const frames: { opacity: number; posters: string }[] = [];
    Object.assign(window, { grid_frames: frames });
    const sample = () => {
      const grid = document.querySelector("a[data-movie-id]")?.parentElement;
      if (grid) {
        const posters = [...grid.querySelectorAll("a[data-movie-id]")].map((a) => a.getAttribute("data-movie-id")).join();
        frames.push({ opacity: Number(getComputedStyle(grid).opacity), posters });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto("/");
  await app_started(page);
  await page.getByRole("button", { name: "þriðjudag" }).filter({ visible: true }).click();
  const tuesday = await poster_titles(page);
  await page.locator("a[data-movie-id]").first().click();
  await page.waitForURL(/\/movie\//);
  const mark = await page.evaluate(() => (window as unknown as { grid_frames: unknown[] }).grid_frames.length);
  await page.goBack();
  await expect.poll(() => poster_titles(page)).toEqual(tuesday);
  await page.waitForTimeout(800);
  const after = await page.evaluate(
    (from) => (window as unknown as { grid_frames: { opacity: number; posters: string }[] }).grid_frames.slice(from),
    mark
  );
  const settled = after.at(-1)!.posters;
  expect(after.length).toBeGreaterThan(0);
  // Every frame back on the home page shows Tuesday's posters, fully sharp.
  expect(after.filter((f) => f.posters !== "").every((f) => f.posters === settled)).toBe(true);
  expect(after.map((f) => f.opacity).filter((o) => o < 1)).toEqual([]);
});
