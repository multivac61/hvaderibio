import { expect, test } from "@playwright/test";

const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

// The phone's picker always names the cinema being shown, wherever the
// choice was made: on this page, or on another before coming here.
test("phone: the picker shows the chosen cinema across pages", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);

  const pill = page.locator("#select-cinemas");
  await pill.tap();
  const cinemas = page.getByRole("dialog").getByRole("radiogroup", { name: "Veldu kvikmyndahús" }).getByRole("radio");
  const other = (await cinemas.last().textContent())!.trim();
  await expect(pill).not.toContainText(other);
  await cinemas.last().tap();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(pill).toContainText(other);

  await page.locator("a[data-movie-id]").first().tap();
  await page.waitForURL(/\/movie\//);
  await expect(page.locator("#select-cinemas-movie-mobile")).toContainText(other);

  await page.goBack();
  await expect(pill).toContainText(other);
});
