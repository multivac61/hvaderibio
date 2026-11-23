import { devices, expect, test, type Page } from "@playwright/test";

const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

const expect_about_page = async (page: Page) => {
  await expect(page).toHaveURL(/\/um$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hvað er í bíó?");
  // The maintainer's name opens an email; Hugi's name leads to Hugi's site.
  await expect(page.locator('a[href="mailto:olafurbjarki@gmail.com"]').first()).toHaveText("Ólafur Bjarki");
  await expect(page.locator('a[href="https://hugihlynsson.com/"]')).toHaveText("Hugi Hlynsson");
  await expect(page.getByRole("link", { name: "opinn hugbúnaður" })).toHaveAttribute("href", "https://github.com/multivac61/hvaderibio");
  await expect(page.getByRole("link", { name: "Jökull Sólberg" })).toHaveAttribute("href", "https://www.solberg.is/");
  // Open source, and where it began: the code of this site and of the
  // first one, and the earlier sites as the Wayback Machine kept them.
  await expect(page.locator('a[href="https://github.com/hugihlynsson/hvad-er-i-bio"]')).toBeVisible();
  expect(await page.locator('a[href^="https://web.archive.org/web/"]').count()).toBeGreaterThanOrEqual(3);
};

test("desktop: the title leads to the page about the site", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  // The title is the way there; the phones' footer link is not shown.
  await expect(page.getByRole("link", { name: "Um síðuna" })).toBeHidden();
  await page.getByRole("link", { name: "Hvað er í bíó?" }).click();
  await expect_about_page(page);
  await context.close();
});

// Phones hide the title, so the page ends with the way there instead.
test("phone: the end of the programme leads to the page about the site", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await page.getByRole("link", { name: "Um síðuna" }).tap();
  await expect_about_page(page);
});

// One main landmark per page, the layout's: a screen reader's "skip to
// main" has one place to go. The about page had a second inside it.
for (const path of ["/", "/um", "/movie/verity", "/movie/verity/trailer"]) {
  test(`${path} has a single main landmark`, async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MORNING);
    await page.goto(path);
    await expect(page.locator("main, [role=main]")).toHaveCount(1);
  });
}

// The story starts from where the site is now, then goes back in time.
test("the about page's history starts with today", async ({ page }) => {
  await page.goto("/um");
  const years = page.locator("ol > li > p:first-of-type");
  await expect(years).toHaveText(["Í dag", "2023", "2013"]);
});
