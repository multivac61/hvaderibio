import { expect, test } from "@playwright/test";

const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

// The phone's cinema menu always names the cinema being shown, wherever the
// choice was made: on this page, or on another before coming here.
test("phone: the cinema menu shows the chosen cinema across pages", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);

  const menu = page.locator("#select-cinemas");
  const options = await menu.locator("option").evaluateAll((all) => all.map((option) => (option as HTMLOptionElement).value));
  const other = options.at(-1)!;
  expect(await menu.inputValue()).not.toBe(other);

  await menu.selectOption(other);
  await expect(menu).toHaveValue(other);

  await page.locator("a[data-movie-id]").first().tap();
  await page.waitForURL(/\/movie\//);
  await expect(page.locator("#select-cinemas-movie-mobile")).toHaveValue(other);

  await page.goBack();
  await expect(menu).toHaveValue(other);
});
