import { devices, expect, test, type Page } from "@playwright/test";

const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");

const alpha = (color: string) => {
  const match = color.match(/\/\s*([\d.]+)\)$|rgba\([^)]*,\s*([\d.]+)\)$/);
  return match ? Number(match[1] ?? match[2]) : 1;
};

const open_home = async (page: Page, now = FIXTURE_MORNING) => {
  await page.clock.setFixedTime(now);
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText(/myndir?$/);
};

// The panel opens over the posters as frosted glass. Its blur has to see
// them: a view-transition name on the panel would make it a backdrop root
// and leave the posters sharp under the list, so it only has one while a
// transition runs.
test("desktop: the panel blurs the posters behind it", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  const panel = page.locator(".programme-panel-clip");
  await expect(panel).toBeVisible();
  const style = await panel.evaluate((element) => ({
    blur: getComputedStyle(element).backdropFilter,
    name: getComputedStyle(element.parentElement!).viewTransitionName,
  }));
  expect(style.blur).toContain("blur(");
  expect(style.name).toBe("none");
  await context.close();
});

// Choosing a day keeps the panel open over the posters, and the day lands
// at once, with no view transition: lifted onto a transition's layer, the
// panel could not see the posters to frost them, and Safari left them sharp
// under the list.
test("desktop: the panel stays frosted while the day changes", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  // A click lands only once the panel has grown out of the pill: until then
  // its rows lie outside the growing clip, and a click there misses them.
  await expect.poll(() => page.locator(".programme-panel").evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.evaluate(() => {
    const record = window as unknown as { transitioned: boolean };
    record.transitioned = false;
    const look = () => {
      if (document.documentElement.matches(":active-view-transition")) record.transitioned = true;
      requestAnimationFrame(look);
    };
    look();
  });
  await page.getByRole("radio", { name: "Á morgun", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Á morgun", exact: true })).toBeChecked();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as unknown as { transitioned: boolean }).transitioned)).toBe(false);
  expect(await page.locator(".programme-panel-clip").evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("blur(");
  await context.close();
});

// Open, the panel carries the pill's phrase where the pill was. The pill
// itself makes way, or it showed through the glass as a second pill.
test("desktop: the pill makes way for the panel that grew from it", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  const pill = page.locator("#select-cinemas-desktop");
  await expect(pill).toHaveCSS("opacity", "1");
  await pill.click();
  await expect(page.locator(".programme-panel-clip")).toBeVisible();
  await expect(pill).toHaveCSS("opacity", "0");
  await page.keyboard.press("Escape");
  await expect(pill).toHaveCSS("opacity", "1");
  await context.close();
});

// Opened with the mouse, nothing in the panel wears a focus ring: Safari
// drew one around the phrase row that bits-ui focused on opening. Opened
// from the keyboard, focus lands on the chosen day, ready for the arrows.
test("desktop: opening the panel puts focus where it helps", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  const pill = page.locator("#select-cinemas-desktop");
  await pill.click();
  await expect(page.locator(".programme-panel-clip")).toBeVisible();
  expect(await page.evaluate(() => document.querySelector(".programme-panel :focus-visible")?.outerHTML.slice(0, 80) ?? null)).toBeNull();
  await page.keyboard.press("Escape");
  await expect(pill).toBeFocused();

  await page.keyboard.press("Enter");
  const today = page.getByRole("radiogroup", { name: "Veldu dag" }).getByRole("radio", { checked: true });
  await expect(today).toBeFocused();
  await context.close();
});

// The panel's frost must reach every engine. The build's minifier took the
// standard backdrop-filter and Safari's -webkit- copy for one property and
// kept only the last written, the prefixed one, which Chromium ignores: no
// blur there at all. WebKit, which runs these tests, reads either name, so
// check what the built stylesheets hold.
test("the built styles frost the panel in every engine", async ({ page }) => {
  await open_home(page);
  const rules = await page.evaluate(async () => {
    const sheets = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) => link.href);
    const text = (await Promise.all(sheets.map((href) => fetch(href).then((response) => response.text())))).join("\n");
    return [
      ...text.matchAll(/[^{}]*(?:programme-panel-clip|view-transition-group\(programme-panel\))[^{}]*\{[^}]*backdrop-filter[^}]*\}/g),
    ].map((match) => match[0]);
  });
  expect(rules.length).toBeGreaterThan(0);
  for (const rule of rules) expect(rule).toMatch(/(^|[;{])backdrop-filter:/);
});

// The days share the row. A label wider than its share pushes the last day
// past the track's edge, which cuts off the highlight's rounded corner. A
// Sunday lists the longest run of names, up to Miðvikudag.
test("desktop: every day fits inside the day row", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page, new Date("2026-10-04T09:00:00Z"));
  await page.locator("#select-cinemas-desktop").click();
  const days = page.locator(".programme-panel").getByRole("radiogroup", { name: "Veldu dag" }).getByRole("radio");
  await expect(days).toHaveCount(4);
  const overflow = await days.evaluateAll((buttons) => {
    const row = buttons[0]!.parentElement!.getBoundingClientRect();
    return buttons
      .map((button) => ({ label: button.textContent!.trim(), rect: button.getBoundingClientRect(), button }))
      .filter(({ rect, button }) => rect.left < row.left - 0.5 || rect.right > row.right + 0.5 || button.scrollWidth > button.clientWidth)
      .map(({ label }) => label);
  });
  expect(overflow).toEqual([]);
  await context.close();
});

// Safari colours the strip under its toolbar from what is fixed at the
// bottom edge. A sheet sliding through that edge makes it repaint the strip
// frame by frame, behind the animation, so a still floor in the sheet's
// colour holds the edge from the first frame to the last.
// The sheet is the same frosted glass as the desktop panel. Safari cannot
// take its toolbar's colour from glass, so the floor under it is solid.
test("phone: the bottom edge stays solid under the glass sheet while it rises", async ({ page }) => {
  await open_home(page);
  await page.locator("#select-cinemas").tap();
  const floor = page.locator("[data-sheet-floor]");
  await expect(floor).toBeAttached();
  const state = await floor.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const sheet = document.querySelector<HTMLElement>("[role=dialog]")!;
    return {
      bottom: rect.bottom,
      height: innerHeight,
      background: getComputedStyle(element).backgroundColor,
      sheet: getComputedStyle(sheet).backdropFilter || getComputedStyle(sheet).getPropertyValue("-webkit-backdrop-filter"),
    };
  });
  expect(state.bottom).toBe(state.height);
  expect(alpha(state.background)).toBe(1);
  expect(state.sheet).toContain("blur(");
  // The pill it rose from would show through the glass; it makes way.
  await expect(page.locator("#select-cinemas")).toHaveCSS("opacity", "0");

  // It leaves the moment the sheet starts down. Kept until the sheet is
  // gone, Safari went on painting its toolbar grey over the posters the
  // sheet had already uncovered.
  // Noted in the page as it happens: polling from the test can miss a
  // close that lasts 300ms.
  await page.evaluate(() => {
    const record = window as unknown as { sheet_when_floor_left?: boolean };
    new MutationObserver((_, observer) => {
      if (document.querySelector("[data-sheet-floor]")) return;
      record.sheet_when_floor_left = !!document.querySelector("[role=dialog]");
      observer.disconnect();
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => (window as unknown as { sheet_when_floor_left?: boolean }).sheet_when_floor_left)).toBe(true);
});
