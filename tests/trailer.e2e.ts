import { readdirSync } from "node:fs";
import { devices, expect, test } from "@playwright/test";

// On desktop the trailer plays on a page of its own, so the browser's back
// and forward buttons step in and out of it like any other page.
test("desktop: the trailer opens as a page that back and forward step through", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Safari"], baseURL });
  const page = await context.newPage();
  // Keep the test off YouTube; only the embed's address matters here.
  await page.route("https://www.youtube.com/**", (route) => route.fulfill({ body: "" }));

  await page.goto("/movie/verity");
  await expect(page.getByRole("heading", { name: "Verity" })).toBeVisible();
  const movie_url = page.url();
  const back_link = page.getByRole("link", { name: "Til baka" });
  const back_on_movie = await back_link.boundingBox();

  await page.getByRole("link", { name: "Spila stiklu" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/trailer$/);
  await expect(page.locator("iframe[title='Stikla: Verity']")).toHaveAttribute("src", /youtube\.com\/embed\/.+autoplay=1/);
  // "Til baka" stays where it was on the movie page.
  expect(await back_link.boundingBox()).toEqual(back_on_movie);

  await page.goBack();
  await expect(page).toHaveURL(movie_url);
  await expect(page.getByRole("heading", { name: "Verity" })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/\/trailer$/);
  await expect(page.locator("iframe[title='Stikla: Verity']")).toBeVisible();
  await context.close();
});

// Phones open the YouTube app, in the same tab so that without the app the
// back button still returns to the movie.
test("phone: the trailer goes to YouTube", async ({ page }) => {
  await page.goto("/movie/verity");
  const trailer = page.getByRole("link", { name: "Spila stiklu" }).filter({ visible: true });
  await expect(trailer).toHaveAttribute("href", /^https:\/\/www\.youtube\.com\/watch\?v=.+/);
  await expect(trailer).not.toHaveAttribute("target", /.*/);
});

// Opening a movie on a phone shows its trailer thumbnail first, fetched
// from YouTube after the page itself. Until it has arrived the dark box and
// play button hold its place; then it fades in whole rather than popping in
// or drawing in strips as it decodes.
test("phone: the trailer thumbnail fades in once it has loaded", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-03T09:00:00Z"));
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  const stand_in = readdirSync("static").find((file) => file.endsWith(".webp"))!;
  await page.route("https://img.youtube.com/**", async (route) => {
    await held;
    await route.fulfill({ path: `static/${stand_in}`, contentType: "image/webp" });
  });

  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
  await page
    .locator("a[data-movie-id]")
    .filter({ has: page.getByAltText("Verity", { exact: true }) })
    .tap();
  await expect(page.getByRole("heading", { name: "Verity" })).toBeVisible();

  const thumbnail = page.getByRole("link", { name: "Spila stiklu" }).filter({ visible: true }).locator("img");
  await expect(thumbnail).toHaveCSS("opacity", "0");
  release();
  await expect(thumbnail).toHaveCSS("opacity", "1");
});

test.describe("before the app starts", () => {
  test.use({ javaScriptEnabled: false });

  test("phone: the trailer thumbnail shows", async ({ page }) => {
    await page.goto("/movie/verity");
    const thumbnail = page.getByRole("link", { name: "Spila stiklu" }).filter({ visible: true }).locator("img");
    await expect(thumbnail).toHaveCSS("opacity", "1");
  });
});

// The player is as large as the window allows below "Til baka", using the
// window's full width rather than the movie page's text column: it fills
// the width on a tall window and the height on a wide one, never scrolling.
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1728, height: 1000 },
  { width: 900, height: 1100 },
]) {
  test(`desktop ${viewport.width}×${viewport.height}: the trailer fills the window without scrolling`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ ...devices["Desktop Safari"], viewport, baseURL });
    const page = await context.newPage();
    await page.route("https://www.youtube.com/**", (route) => route.fulfill({ body: "" }));
    await page.goto("/movie/verity/trailer");
    // Fathom counts the visit with a 1×1 image appended to <body>, below
    // <main>; whether it has arrived yet is up to the network. Add one now so
    // the page is measured with it every time.
    await page.evaluate(() => document.body.append(Object.assign(new Image(1, 1), { alt: "" })));

    const fit = await page.locator("iframe").evaluate((player) => {
      const content = (el: Element) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          width: rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          bottom: rect.bottom - parseFloat(style.paddingBottom),
        };
      };
      const box = player.getBoundingClientRect();
      return {
        ratio: box.width / box.height,
        fills_width: Math.abs(box.width - content(document.querySelector("main")!).width) < 2,
        fills_height: Math.abs(box.bottom - content(player.parentElement!).bottom) < 2,
        // Whatever reaches past the window, to name the culprit if it scrolls.
        overflow: [...document.querySelectorAll("body *")]
          .filter((el) => el.getBoundingClientRect().bottom > innerHeight || el.getBoundingClientRect().right > innerWidth)
          .map((el) => `${el.tagName} ${JSON.stringify(el.getBoundingClientRect())}`),
        page: { scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], window: [innerWidth, innerHeight] },
      };
    });
    await context.close();

    expect(fit.ratio).toBeCloseTo(16 / 9, 1);
    expect(fit.fills_width || fit.fills_height).toBe(true);
    expect(fit.overflow).toEqual([]);
    expect(fit.page.scroll).toEqual(fit.page.window);
  });
}
