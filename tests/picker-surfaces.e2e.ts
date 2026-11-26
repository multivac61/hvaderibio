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

// The panel is solid. Through glass, the showtimes it opens over were seen
// blanking and swapping under the choices made in it, their edges showing
// beside it.
test("desktop: nothing shows through the panel", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  const panel = page.locator(".programme-panel-clip");
  await expect(panel).toBeVisible();
  const style = await panel.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    blur: getComputedStyle(element).backdropFilter,
  }));
  expect(alpha(style.background)).toBe(1);
  expect(style.blur).toBe("none");
  await context.close();
});

// Choosing a day keeps the panel open, and the day lands at once, with no
// view transition: a transition takes every input until it ends, so a
// second day clicked a moment after the first was lost.
test("desktop: a day lands at once, with the panel open", async ({ browser, baseURL }) => {
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
  await context.close();
});

// Closing, the panel shrinks back into the pill by its clip. Where the
// compositor runs that clip, Chromium (Dia) drew one frame of the panel
// without it as the clip ended: the whole panel, empty, flashing back after
// it had closed. So it ends see-through as well, over the pill already
// shown beneath it, and a frame without its clip shows nothing.
test("desktop: the panel ends its close see-through", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  const panel = page.locator(".programme-panel");
  await expect.poll(() => panel.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.keyboard.press("Escape");
  // Where the close lands, without waiting for it to get there.
  const end = await panel.evaluate((el: HTMLElement) => {
    if (!el.hasAttribute("data-ending-style")) return null;
    el.style.transition = "none";
    return getComputedStyle(el).opacity;
  });
  expect(end).toBe("0");
  await context.close();
});

// The panel's caret turns rather than jumps: it grows out of the pill
// pointing down, as the pill's does, turns up as the panel opens, and turns
// back down as it closes. It jumped up in one frame, and on the way out the
// panel's up caret faded over the pill's down one, the two crossed.
test("desktop: the panel's caret turns between the pill's and its own", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  const panel = page.locator(".programme-panel");
  const caret = panel.locator("[data-panel-phrase] svg").last();
  await expect.poll(() => panel.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  expect(await caret.evaluate((el) => getComputedStyle(el).rotate)).toBe("180deg");
  await page.keyboard.press("Escape");
  // Where the close lands, without waiting for it to get there.
  const end = await caret.evaluate((el: SVGElement) => {
    if (!el.closest("[data-ending-style]")) return null;
    el.style.transition = "none";
    return getComputedStyle(el).rotate;
  });
  expect(end).toMatch(/^(none|0deg)$/);
  await context.close();
});

// The panel grows out of the pill on a curve that leaves at once, as it
// closes: an in-out start held it still under the click for its first
// frames. Nor does it jump: the curve before put half the growth into the
// first two frames, then crept, and the steps read as separate stills.
test("desktop: the panel grows out of the pill at once", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  const panel = page.locator(".programme-panel");
  await expect.poll(() => panel.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  const curves = await panel.evaluate((el) => [
    getComputedStyle(el.querySelector(".programme-panel-clip")!).transitionTimingFunction,
    getComputedStyle(el.querySelector(".programme-caret")!).transitionTimingFunction,
  ]);
  expect(curves).toEqual(["cubic-bezier(0.3, 0.6, 0.2, 1)", "cubic-bezier(0.3, 0.6, 0.2, 1)"]);
  await context.close();
});

// The shape, its list, its shadow and its caret move on one clock. Timed
// apart, the panel opened as an empty slab, then filled, then cast its
// shadow, three steps where there should be one motion.
test("desktop: the panel's parts open together", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  const panel = page.locator(".programme-panel");
  await expect.poll(() => panel.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  const timing = await panel.evaluate((el) =>
    [
      getComputedStyle(el.querySelector(".programme-panel-clip")!),
      getComputedStyle(el.querySelector(".programme-panel-body")!),
      getComputedStyle(el, "::before"),
      getComputedStyle(el.querySelector(".programme-caret")!),
    ].map((style) => `${style.transitionDuration} ${style.transitionDelay}`)
  );
  expect(new Set(timing)).toEqual(new Set(["0.28s 0s"]));
  await context.close();
});

// The panel's drop shadow grows and shrinks with the shape by a transform,
// which the compositor runs, rather than as a box-shadow repainted every
// frame. Faded instead, at full size, its outline showed around the
// smaller shape as a ghost of the whole panel.
test("desktop: the panel's shadow follows the shape without repainting", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  const panel = page.locator(".programme-panel");
  await expect.poll(() => panel.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  const style = await panel.evaluate((el) => ({
    own: getComputedStyle(el).transitionProperty,
    shadow: getComputedStyle(el, "::before").boxShadow,
    fades: getComputedStyle(el, "::before").transitionProperty,
  }));
  expect(style.own).not.toContain("box-shadow");
  expect(style.shadow).not.toBe("none");
  expect(style.fades).toBe("transform");
  await context.close();
});

// The days' highlight glides to a day pointed at, but follows the arrow
// keys at once: a held key retargeted the glide over and over, trailing
// the focus ring.
test("desktop: arrow keys move the day highlight at once", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").focus();
  await page.keyboard.press("Enter");
  const panel = page.locator(".programme-panel");
  await expect.poll(() => panel.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  const days = panel.getByRole("radiogroup", { name: "Veldu dag" });
  await days.getByRole("radio", { checked: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(days.getByRole("radio", { name: "Á morgun", exact: true })).toBeChecked();
  const glides = await days.evaluate(
    (el) =>
      el.getAnimations({ subtree: true }).filter((animation) => (animation as CSSTransition).transitionProperty === "clip-path").length
  );
  expect(glides).toBe(0);
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
// Turned or resized across the phone's width, the open picker belongs to a
// pill that has just been hidden: the panel stood off-screen beside nothing,
// or the sheet spread across a desktop. It is put away instead; the pill
// now shown opens the right one.
test("desktop: the panel goes when the window narrows to a phone's", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  await expect(page.locator(".programme-panel")).toBeVisible();
  await page.setViewportSize({ width: 500, height: 800 });
  await expect(page.locator(".programme-panel")).toHaveCount(0);
  await context.close();
});

test("phone: the sheet goes when the window widens to a desktop's", async ({ page }) => {
  await open_home(page);
  await page.locator("#select-cinemas").tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-sheet-pushed"))).toBe(false);
  await expect(page.locator("#select-cinemas-desktop")).toBeVisible();
});

// A screen reader announces the panel by name, as it does the phone's sheet,
// and its close button by the phrase it shows (a voice user says what they
// see), not by a word that appears nowhere on screen.
test("desktop: the panel and its close button are named for what they show", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Desktop Chrome"], baseURL });
  const page = await context.newPage();
  await open_home(page);
  await page.locator("#select-cinemas-desktop").click();
  const panel = page.getByRole("dialog", { name: "Hvenær og hvar?" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "Loka vali: Í dag Höfuðborgarsvæðið" })).toBeVisible();
  await context.close();
});

// A click outside the panel only puts it away, as a menu does; the phone's
// sheet swallows the tap the same way. It went on to open the poster under
// it, a movie the visitor never meant to pick.
for (const [name, device, press] of [
  ["desktop", "Desktop Chrome", "click"],
  ["phone held sideways", "iPhone 15 landscape", "tap"],
] as const) {
  test(`${name}: a press beside the open panel only closes it`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ ...devices[device], baseURL });
    const page = await context.newPage();
    await open_home(page);
    await page.locator("#select-cinemas-desktop").click();
    await expect.poll(() => page.locator(".programme-panel").evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    const poster = page.locator("a[data-movie-id]").last();
    await poster[press]();
    await expect(page.locator(".programme-panel")).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(new URL(page.url()).pathname).toBe("/");
    // The next press is the visitor's own again.
    await poster[press]();
    await page.waitForURL(/\/movie\//);
    await context.close();
  });
}

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
