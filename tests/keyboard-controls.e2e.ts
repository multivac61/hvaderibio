import { devices, expect, test, type Page } from "@playwright/test";

// The day and cinema controls from the keyboard. Each group of choices is
// one tab stop and the arrow keys move the choice, as in a radio group;
// reaching the fourth day by Tab alone took a press for every control on
// the way.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

async function open_home(page: Page) {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
}

test.describe("desktop header", () => {
  // A desktop browser by its name too, so each change runs as a view
  // transition, as it does for visitors there.
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: devices["Desktop Chrome"].userAgent });

  test("arrow keys move the day, and wrap at the ends", async ({ page }) => {
    await open_home(page);
    const days = page.getByRole("radiogroup", { name: "Veldu dag" }).filter({ visible: true }).getByRole("radio");
    await expect(days).toHaveCount(4);
    await days.first().focus();

    await page.keyboard.press("ArrowRight");
    await expect(days.nth(1)).toBeChecked();
    await expect(days.nth(1)).toBeFocused();
    await expect(days.first()).not.toBeChecked();

    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(days.last()).toBeChecked();
    await expect(days.last()).toBeFocused();
  });

  test("the days are one tab stop, entered on the chosen day", async ({ page }) => {
    await open_home(page);
    const group = page.getByRole("radiogroup", { name: "Veldu dag" }).filter({ visible: true });
    const days = group.getByRole("radio");
    await days.first().focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(days.nth(2)).toBeFocused();

    await page.keyboard.press("Tab");
    expect(await group.evaluate((el) => el.contains(document.activeElement))).toBe(false);
    await page.keyboard.press("Shift+Tab");
    await expect(days.nth(2)).toBeFocused();
  });

  test("arrow keys move the cinema, and the programme follows", async ({ page }) => {
    await open_home(page);
    const cinemas = page.getByRole("radiogroup", { name: "Veldu kvikmyndahús" }).getByRole("radio");
    const chosen = page.getByRole("radio", { name: "Höfuðborgarsvæðið" });
    await expect(chosen).toBeChecked();
    const before = await page.getByRole("status").textContent();
    await chosen.focus();

    await page.keyboard.press("ArrowLeft");
    await expect(cinemas.first()).toBeChecked();
    await expect(cinemas.first()).toBeFocused();
    await expect(cinemas.first()).toHaveText("Allt");

    // One cinema shows fewer films than the whole capital region.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(cinemas.nth(2)).toBeChecked();
    await expect(page.getByRole("status")).not.toHaveText(before!);
  });
});

test.describe("phone bar", () => {
  test("arrow keys move the day", async ({ page }) => {
    await open_home(page);
    const days = page.locator("[data-floating-bar]").getByRole("radio");
    await days.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(days.nth(1)).toBeChecked();
    await expect(days.nth(1)).toBeFocused();
  });
});
