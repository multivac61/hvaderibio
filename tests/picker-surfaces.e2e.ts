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

// Choosing a day keeps the panel open over the posters. It stays part of
// the page while the grid changes behind it: lifted onto a layer of its
// own, it can no longer see the posters to frost them, and Safari leaves
// them sharp under the list.
test("desktop: the panel stays frosted while the day changes", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  await expect(page.locator(".programme-panel-clip")).toBeVisible();
  await page.evaluate(() => {
    const record = window as unknown as { during?: { name: string; blur: string; layers: string[] } };
    const look = () => {
      if (!document.documentElement.matches(":active-view-transition")) return requestAnimationFrame(look);
      const panel = document.querySelector(".programme-panel")!;
      record.during = {
        name: getComputedStyle(panel).viewTransitionName,
        blur: getComputedStyle(panel.firstElementChild!).backdropFilter,
        layers: document
          .getAnimations()
          .map((animation) => (animation.effect as KeyframeEffect | null)?.pseudoElement ?? "")
          .filter((pseudo) => pseudo.includes("poster-")),
      };
    };
    look();
  });
  await page.getByRole("radio", { name: "Á morgun", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { during?: object }).during)).toBeDefined();
  const during = await page.evaluate(() => (window as unknown as { during: { name: string; blur: string; layers: string[] } }).during);
  expect(during.name).toBe("none");
  expect(during.blur).toContain("blur(");
  // Posters lifted out of the page would be drawn over it.
  expect(during.layers).toEqual([]);
  await context.close();
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
