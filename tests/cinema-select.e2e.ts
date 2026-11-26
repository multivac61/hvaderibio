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

// A movie with nothing for the visitor's day and cinema offers to clear the
// choice, back to today in the capital, rather than send them across the
// country to wherever it happens to play.
test("phone: a movie with nothing for the choice offers to clear it", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/movie/hvolpasveitin-risaedlumyndin");
  const pill = page.locator("#select-cinemas-movie-mobile");
  await expect(pill).toHaveCSS("opacity", "1");
  await pill.tap();
  await page.getByRole("dialog").getByRole("radio", { name: "Bíó Paradís", exact: true }).tap();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Engar sýningar fundust fyrir þetta val.")).toBeVisible();
  await page.getByRole("button", { name: "Hreinsa val" }).tap();
  await expect(pill).toContainText("Í dag");
  await expect(pill).toContainText("Höfuðborgarsvæðið");
  await expect(page.getByRole("link", { name: /^13:00/ }).first()).toBeVisible();
});

// With the choice already the default, clearing it would change nothing.
test("phone: nothing left on the default choice offers no clearing", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-03T20:30:00Z"));
  await page.goto("/movie/hvolpasveitin-risaedlumyndin");
  await expect(page.getByRole("status")).not.toBeEmpty();
  await expect(page.getByText("Engar sýningar fundust fyrir þetta val.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Hreinsa val" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Sýnd/ })).toHaveCount(0);
});

// A movie's showtimes sit on solid cards: on 3% white the stars showed
// through them, and under the picker they read as see-through.
test("phone: a movie's showtime cards are solid", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/movie/hvolpasveitin-risaedlumyndin");
  const opaque = (color: string) => !/\/\s*0?\.\d+\)$|rgba\([^)]*,\s*0?\.\d+\)$/.test(color);
  const row = page.locator("[data-day-programme] > *").first();
  await expect(row).toBeVisible();
  expect(opaque(await row.evaluate((el) => getComputedStyle(el).backgroundColor))).toBe(true);

  const pill = page.locator("#select-cinemas-movie-mobile");
  await expect(pill).toHaveCSS("opacity", "1");
  await pill.tap();
  await page.getByRole("dialog").getByRole("radio", { name: "Bíó Paradís", exact: true }).tap();
  const empty = page.locator("[data-day-programme]", { hasText: "Engar sýningar fundust fyrir þetta val." });
  await expect(empty).toBeVisible();
  expect(opaque(await empty.evaluate((el) => getComputedStyle(el).backgroundColor))).toBe(true);
});
