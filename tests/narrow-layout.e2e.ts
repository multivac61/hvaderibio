import { expect, test } from "@playwright/test";

// Layout at the edges of the range of screens: the narrowest phones, the
// tablet widths where the desktop header first shows, and fingers rather
// than a mouse.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");
// A Monday, so the picker carries its two longest labels, "Miðvikudag" and
// "Fimmtudag".
const FIXTURE_MONDAY = new Date("2026-10-05T09:00:00Z");

test.describe("320px phone", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  // Two posters did not fit side by side, so the grid fell to one column of
  // posters taller than the screen.
  test("posters stay two to a row", async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MORNING);
    await page.goto("/");
    const posters = page.locator('a[href^="/movie/"]');
    await expect(posters.first()).toBeVisible();
    const [first, second] = await Promise.all([posters.nth(0).boundingBox(), posters.nth(1).boundingBox()]);
    expect(second!.y).toBe(first!.y);
    expect(second!.x).toBeGreaterThan(first!.x);
  });

  // The labels broke onto two lines, "á / morgun", doubling the row's height.
  test("day labels stay on one line, inside the screen", async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MONDAY);
    await page.goto("/");
    await page.locator("#select-cinemas").tap();
    const days = page.getByRole("dialog").getByRole("radiogroup", { name: "Veldu dag" }).getByRole("radio");
    await expect(days.first()).toBeVisible();
    const boxes = await days.evaluateAll((buttons) =>
      buttons.map((button) => {
        const range = document.createRange();
        range.selectNodeContents(button);
        const { left, right } = button.getBoundingClientRect();
        return { lines: new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size, left, right };
      })
    );
    expect(boxes).toHaveLength(4);
    for (const { lines, left, right } of boxes) {
      expect(lines).toBe(1);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(320);
    }
  });
});

test.describe("768px tablet", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  // A "·" separates the items of the movie page's meta row. Where the row
  // wrapped, one was left at the end of a line, or at the start of the next.
  for (const width of [768, 800, 844]) {
    test(`${width}px: separators sit between items, never at a line's start or end`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1024 });
      await page.goto("/movie/coyote-vs-acme");
      const row = page.locator("[data-meta-row]");
      await expect(row).toBeVisible();
      const items = await row.evaluate((row) => {
        const shown = [...row.children].filter((child) => child.getClientRects().length > 0);
        return shown.map((item) => {
          const box = item.getBoundingClientRect();
          const starts_line = !shown.some((other) => {
            const b = other.getBoundingClientRect();
            return b.right <= box.left && b.bottom > box.top && b.top < box.bottom;
          });
          // What is drawn in the middle of the gap to the item's left.
          const in_gap = document.elementFromPoint(box.left - 10, box.top + box.height / 2);
          return { text: item.textContent.trim(), starts_line, separated: in_gap !== null && item.contains(in_gap) };
        });
      });
      expect(items.length).toBeGreaterThan(4);
      expect(items.filter(({ starts_line }) => starts_line).length).toBeGreaterThan(1);
      for (const { text, starts_line, separated } of items) {
        expect(text).not.toBe("·");
        expect(separated, text).toBe(!starts_line);
      }
    });
  }
});

// The error page filled the screen inside <main>'s padding, so it was that
// much taller than the screen and scrolled.
test("the error page fits the screen", async ({ page }) => {
  await page.goto("/movie/engin-slik-mynd");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  const { content, screen } = await page.evaluate(() => ({ content: document.documentElement.scrollHeight, screen: innerHeight }));
  expect(content).toBeLessThanOrEqual(screen);
});

// Small controls take a finger that lands a little outside them. Each must
// answer a touch 4px below its drawn edge.
test.describe("touch targets", () => {
  const answers_below = (el: Element) => {
    const box = el.getBoundingClientRect();
    const under = document.elementFromPoint(box.left + box.width / 2, box.bottom + 4);
    return under !== null && el.contains(under);
  };

  test("day buttons", async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MORNING);
    await page.goto("/");
    await expect(page.locator("#select-cinemas")).toHaveCSS("opacity", "1");
    await page.locator("#select-cinemas").tap();
    // A finger lands once the sheet has risen, not while it moves.
    const sheet = page.getByRole("dialog");
    await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0);
    const days = sheet.getByRole("radiogroup", { name: "Veldu dag" }).getByRole("radio");
    await expect(days).toHaveCount(4);
    for (const day of await days.all()) expect(await day.evaluate(answers_below)).toBe(true);
  });

  test("showtimes and the way back", async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MORNING);
    await page.goto("/movie/coyote-vs-acme");
    expect(await page.getByRole("link", { name: "Til baka" }).evaluate(answers_below)).toBe(true);
    const showtime = page.locator('a[aria-label*="Kaupa miða"]').first();
    // Clear of the floating bar, which would take the touch itself.
    await showtime.evaluate((el) => el.scrollIntoView({ block: "center" }));
    expect(await showtime.evaluate(answers_below)).toBe(true);
  });
});

// The picker's sheet on the smallest phones: taller than the screen allows,
// so its list must scroll. It did not, and the last cinema was out of reach.
test.describe("320×568 phone sheet", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("the cinema list scrolls to its last cinema", async ({ page }) => {
    await page.clock.setFixedTime(FIXTURE_MORNING);
    await page.goto("/");
    await page.locator("#select-cinemas").tap();
    const sheet = page.getByRole("dialog");
    await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0);
    // The list scrolls under a title that stays put; the title is the same
    // glass as the rest of the sheet, with no surface of its own.
    const body = sheet.locator("[data-sheet-body]");
    const { overflows, touch_action } = await body.evaluate((el) => ({
      overflows: el.scrollHeight > el.clientHeight,
      touch_action: getComputedStyle(el).touchAction,
    }));
    expect(overflows).toBe(true);
    // Vertical panning must stay the browser's, or a finger cannot scroll.
    expect(["auto", "pan-y", "manipulation"].some((value) => touch_action.includes(value))).toBe(true);
    const title = sheet.getByRole("heading", { name: "Hvenær og hvar?" });
    const header = await title.evaluate((el) => {
      const style = getComputedStyle(el.parentElement!);
      return { background: style.backgroundColor, frost: style.backdropFilter };
    });
    expect(header).toEqual({ background: "rgba(0, 0, 0, 0)", frost: "none" });
    const title_top = (await title.boundingBox())!.y;
    const last = sheet.getByRole("radio").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
    expect((await title.boundingBox())!.y).toBe(title_top);
  });
});
