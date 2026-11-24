import { devices, expect, test, type Locator } from "@playwright/test";

const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

// WCAG contrast of an element's text against what lies behind it: its
// ancestors' backgrounds, painted in order over `backdrop`. Colours are
// composited by a canvas, which reads any CSS colour (oklch included) and
// applies its alpha. Glass lets the posters through, so a glass surface is
// measured over a mid-grey backdrop, about what blurred posters average to.
async function contrast(text: Locator, backdrop = "#000") {
  return text.evaluate((el, backdrop) => {
    const layers: string[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const background = getComputedStyle(node).backgroundColor;
      if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent") layers.unshift(background);
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    const paint = (colors: string[]) => {
      ctx.clearRect(0, 0, 1, 1);
      for (const color of colors) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
      }
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const behind = luminance(paint([backdrop, ...layers]));
    const ink = luminance(paint([backdrop, ...layers, getComputedStyle(el).color]));
    return (Math.max(behind, ink) + 0.05) / (Math.min(behind, ink) + 0.05);
  }, backdrop);
}

// Small text needs 4.5:1 (WCAG 1.4.3).
test("the quiet grey text is still readable", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  expect(await contrast(page.getByRole("link", { name: "Um síðuna" }))).toBeGreaterThanOrEqual(4.5);
  await page.goto("/um");
  expect(await contrast(page.getByText("2013", { exact: true }))).toBeGreaterThanOrEqual(4.5);
});

test("phone: the picker's labels are readable on its glass", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
  await page.locator("#select-cinemas").tap();
  const sheet = page.getByRole("dialog");
  for (const label of ["Dagur", "Kvikmyndahús"])
    expect(await contrast(sheet.getByText(label, { exact: true }), "#808080")).toBeGreaterThanOrEqual(4.5);
});

test("desktop: the picker's labels are readable on its glass", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
  await page.locator("#select-cinemas-desktop").click();
  const panel = page.locator(".programme-panel");
  for (const label of ["Dagur", "Kvikmyndahús"])
    expect(await contrast(panel.getByText(label, { exact: true }), "#808080")).toBeGreaterThanOrEqual(4.5);
  await context.close();
});
