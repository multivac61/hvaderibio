import { devices, expect, test, type Page } from "@playwright/test";

// The day and cinema controls from the keyboard, in the picker the pill
// opens. Each group of choices is one tab stop and the arrow keys move the
// choice, as in a radio group; reaching the fourth day by Tab alone took a
// press for every control on the way.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

async function open_home(page: Page) {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
}

async function open_picker(page: Page, pill: string) {
  await expect(page.locator(pill)).toBeVisible();
  await page.locator(pill).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radiogroup", { name: "Veldu dag" }).filter({ visible: true })).toBeVisible();
}

test.describe("desktop header", () => {
  // A desktop browser by its name too, so each change runs as a view
  // transition, as it does for visitors there.
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: devices["Desktop Chrome"].userAgent });

  test("arrow keys move the day, and wrap at the ends", async ({ page }) => {
    await open_home(page);
    await open_picker(page, "#select-cinemas-desktop");
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

  // Each choice runs as a view transition. Pressed faster than they play,
  // the last press must win: an older choice landing after a newer one left
  // the wrong day chosen.
  test("the last of quick presses is the day chosen", async ({ page }) => {
    await open_home(page);
    await open_picker(page, "#select-cinemas-desktop");
    const days = page.getByRole("radiogroup", { name: "Veldu dag" }).filter({ visible: true }).getByRole("radio");
    await days.first().focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    // Five steps right from the first of four days, wrapping: the second.
    await expect(days.nth(1)).toBeChecked();
    await expect(days.nth(1)).toBeFocused();
    await page.waitForTimeout(600);
    await expect(days.nth(1)).toBeChecked();
  });

  test("the days are one tab stop, entered on the chosen day", async ({ page }) => {
    await open_home(page);
    await open_picker(page, "#select-cinemas-desktop");
    const group = page.getByRole("radiogroup", { name: "Veldu dag" }).filter({ visible: true });
    const days = group.getByRole("radio");
    await days.first().focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(days.nth(2)).toBeFocused();
    // The focused day is a tab stop at once. It used to wait for the choice,
    // which lands a frame or more later as a view transition: a Tab in
    // between left the group, and Shift+Tab came back to the old day.
    expect(await days.nth(2).evaluate((radio) => radio.tabIndex)).toBe(0);

    await page.keyboard.press("Tab");
    expect(await group.evaluate((el) => el.contains(document.activeElement))).toBe(false);
    await page.keyboard.press("Shift+Tab");
    await expect(days.nth(2)).toBeFocused();
  });

  // The arrow keys only move the choice; the picker stays open for the next
  // one, as a click on a cinema would close it.
  test("arrow keys move the cinema, and the programme follows", async ({ page }) => {
    await open_home(page);
    await open_picker(page, "#select-cinemas-desktop");
    const cinemas = page.getByRole("radiogroup", { name: "Veldu kvikmyndahús" }).getByRole("radio");
    const chosen = page.getByRole("radio", { name: "Höfuðborgarsvæðið" });
    await expect(chosen).toBeChecked();
    const before = await page.getByRole("status").textContent();
    await chosen.focus();

    await page.keyboard.press("ArrowLeft");
    await expect(cinemas.first()).toBeChecked();
    await expect(cinemas.first()).toBeFocused();
    await expect(cinemas.first()).toHaveText("Öll");

    // One cinema shows fewer films than the whole capital region.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(cinemas.nth(2)).toBeChecked();
    await expect(cinemas.nth(2)).toBeFocused();
    await expect(page.getByRole("status")).not.toHaveText(before!);
  });
});

test.describe("phone sheet", () => {
  test("arrow keys move the day", async ({ page }) => {
    await open_home(page);
    await open_picker(page, "#select-cinemas");
    const days = page.getByRole("dialog").getByRole("radiogroup", { name: "Veldu dag" }).getByRole("radio");
    await days.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(days.nth(1)).toBeChecked();
    await expect(days.nth(1)).toBeFocused();
  });
});
