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

// A movie with nothing left for the chosen day and cinema says where it
// does play, one tap away: arriving from a search on the default (today,
// the capital) in the evening, it said only "none".
test("phone: a movie with nothing left today points to its next showing", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-03T20:30:00Z"));
  await page.goto("/movie/hvolpasveitin-risaedlumyndin");
  await expect(page.getByText("Engar sýningar fundust fyrir þetta val.")).toBeVisible();
  await page.getByRole("button", { name: "Sýnd: Á morgun Höfuðborgarsvæðið" }).tap();
  await expect(page.locator("#select-cinemas-movie-mobile")).toContainText("Á morgun");
  await expect(page.getByRole("link", { name: /^13:00/ }).first()).toBeVisible();
});
