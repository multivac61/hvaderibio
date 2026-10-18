import { devices, expect, test, type Browser, type Locator, type Page } from "@playwright/test";

// The fixture's day, so the home page has posters once the app starts.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

const glare_x = (card: Locator) => card.evaluate((card) => card.style.getPropertyValue("--glare-x"));

// A card's lean and glow, as the mouse last set them; 0 once cleared.
const field = (card: Locator) =>
  card.evaluate((card) => {
    const read = (name: string) => parseFloat(card.style.getPropertyValue(name)) || 0;
    return { tilt_y: read("--tilt-y"), glow: read("--glow") };
  });

const hovered = (card: Locator) => card.evaluate((card) => card.matches(":hover"));

const glow_image = (card: Locator) => card.locator(".poster-glow").evaluate((glow) => getComputedStyle(glow).backgroundImage);

const desktop_page = async (browser: Browser, baseURL: string | undefined, path: string): Promise<Page> => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto(path);
  return page;
};

// A glow fades out when the mouse leaves; its picture has to stay while it
// does, or it vanishes in one frame instead. The glare fades where the mouse
// left it rather than jumping to the top on its way out.
for (const [where, path] of [
  ["home page", "/"],
  ["movie page", "/movie/verity"],
] as const) {
  test(`${where}: a poster's glow fades out, not off, when the mouse leaves`, async ({ browser, baseURL }) => {
    const page = await desktop_page(browser, baseURL, path);
    const cards = page.locator(".poster-card");
    const card = cards.first();
    const box = await card.boundingBox();
    if (!box) throw new Error("poster not laid out");

    // Near the right edge, where the glare would have furthest to jump.
    // Moves before the app starts go unseen, so keep moving until one lands.
    await expect(async () => {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
      expect(await glare_x(card)).toBe("90.0%");
    }).toPass();
    await expect.poll(() => glow_image(card)).toMatch(/^url\(/);
    const neighbour = where === "home page" ? cards.nth(1) : null;
    if (neighbour) await expect.poll(() => glow_image(neighbour)).toMatch(/^url\(/);

    // Up off the page's top, clear of the posters and the gaps between them.
    await page.mouse.move(box.x + box.width * 0.9, 1);
    await expect.poll(() => hovered(card)).toBe(false);
    expect(await glare_x(card)).toBe("90.0%");
    expect(await glow_image(card)).toMatch(/^url\(/);
    if (neighbour) expect(await glow_image(neighbour)).toMatch(/^url\(/);
    await page.context().close();
  });
}

// The poster under the mouse leans and glows; the next one along glows the
// more the nearer the mouse comes, but stays flat until the mouse is on it.
// At the gap between them both glow alike, so crossing over does not jump.
test("home page: the next poster glows, without leaning, as the mouse nears it", async ({ browser, baseURL }) => {
  const page = await desktop_page(browser, baseURL, "/");
  const cards = page.locator(".poster-card");
  const [card, next] = [cards.nth(0), cards.nth(1)];
  const box = await card.boundingBox();
  const next_box = await next.boundingBox();
  if (!box || !next_box) throw new Error("posters not laid out");
  expect(next_box.y).toBe(box.y);
  const y = box.y + box.height / 2;

  await expect(async () => {
    await page.mouse.move(box.x + box.width / 4, y);
    await page.mouse.move(box.x + box.width * 0.75, y);
    expect(await field(card)).toEqual({ tilt_y: 3, glow: 1 });
  }).toPass();
  const far = await field(next);
  expect(far.glow).toBeGreaterThan(0);
  expect(far.tilt_y).toBe(0);

  // In the gap between them, neither leans and both glow alike.
  const gap_middle = (box.x + box.width + next_box.x) / 2;
  await page.mouse.move(gap_middle, y);
  await expect.poll(async () => (await field(next)).glow).toBeGreaterThan(far.glow);
  const [left, right] = [await field(card), await field(next)];
  expect(right.glow).toBeCloseTo(left.glow, 1);
  expect([left.tilt_y, right.tilt_y]).toEqual([0, 0]);
  await page.context().close();
});

// Touch screens have no hover, but iOS keeps a tapped element in :hover.
// Tapping the movie page's poster must not leave it lifted.
test("tablet: tapping the movie poster leaves it flat", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["iPad Mini"], baseURL });
  const page = await context.newPage();
  await page.goto("/movie/verity");
  const card = page.locator(".poster-card");
  await expect(card).toBeVisible();
  await card.tap();
  await page.waitForTimeout(300);
  // Neither scaled nor turned; the perspective alone leaves it flat.
  const { a, b, c, d } = await card.locator(".poster-tilt").evaluate((tilt) => new DOMMatrix(getComputedStyle(tilt).transform).toJSON());
  expect({ a, b, c, d }).toEqual({ a: 1, b: 0, c: 0, d: 1 });
  await context.close();
});
