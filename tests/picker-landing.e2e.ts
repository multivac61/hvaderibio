import { devices, expect, test, type Page } from "@playwright/test";

// A cinema clicked in the desktop panel is held until the panel has closed,
// and only then lands (ProgrammePicker's pick_cinema). Whatever the visitor
// chooses while it is held is newer, and must not be overwritten by it. Each
// race is forced into one frame, as the panel's own timing leaves a window of
// a few frames that a test's key presses only sometimes hit.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

test.use({ viewport: { width: 1280, height: 800 }, userAgent: devices["Desktop Chrome"].userAgent });

async function open_panel(page: Page, pill: string) {
  await page.locator(pill).click();
  await expect.poll(() => page.locator(".programme-panel").evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
}

// Opened again before the close completed, the panel used to land the held
// cinema only once it had opened, over a cinema reached by the arrow keys in
// between.
test("a cinema moved to by arrow keys survives one still landing", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
  await open_panel(page, "#select-cinemas-desktop");

  const result = await page.evaluate(async () => {
    const radios = () => [...document.querySelectorAll<HTMLElement>('[aria-label="Veldu kvikmyndahús"] [role="radio"]')];
    const checked = () => radios().findIndex((radio) => radio.getAttribute("aria-checked") === "true");
    const count = radios().length;
    const old = checked();
    radios()[(old + 2) % count]!.click();
    await Promise.resolve();
    document.getElementById("select-cinemas-desktop")!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const from = checked();
    radios()[from]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const after_arrow = checked();
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { arrowed: (from + 1) % count, after_arrow, settled: checked() };
  });

  expect(result.after_arrow).toBe(result.arrowed);
  expect(result.settled).toBe(result.arrowed);
});

// Opened again before the close completed, the panel shows the cinema just
// clicked, not the one it replaces.
test("reopened at once, the panel shows the cinema just clicked", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
  await open_panel(page, "#select-cinemas-desktop");

  const result = await page.evaluate(async () => {
    const radios = () => [...document.querySelectorAll<HTMLElement>('[aria-label="Veldu kvikmyndahús"] [role="radio"]')];
    const checked = () => radios().findIndex((radio) => radio.getAttribute("aria-checked") === "true");
    const clicked = (checked() + 1) % radios().length;
    radios()[clicked]!.click();
    await Promise.resolve();
    document.getElementById("select-cinemas-desktop")!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { clicked, shown: checked() };
  });

  expect(result.shown).toBe(result.clicked);
});
