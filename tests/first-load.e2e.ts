import { expect, test } from "@playwright/test";

// On a cold load (frequent on iOS, which discards background tabs) the
// posters must be in the HTML, so they show and start downloading before
// the JavaScript has arrived.
test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the home page HTML already lists the posters", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-movie-id]").first()).toBeVisible();
  });
});

// The HTML is rendered at build time; once loaded, the page must still pick
// showings by the visitor's clock.
test("the home page filters by the current time once loaded", async ({ page }) => {
  await page.clock.setSystemTime(Date.now() + 10 * 24 * 3600_000);
  await page.goto("/");
  await expect(page.getByText("Engar sýningar fundust").first()).toBeVisible();
  await expect(page.locator("[data-movie-id]")).toHaveCount(0);
});

// When the visitor's clock drops posters from the build-time grid, those
// fade out and the rest glide into place instead of jumping.
test("posters that drop out after loading leave smoothly", async ({ page }) => {
  await page.clock.setSystemTime(Date.now() + 9 * 3600_000);
  await page.addInitScript(() => {
    type Frame = Record<string, { x: number; y: number; opacity: number }>;
    const frames: Frame[] = ((window as unknown as { poster_frames: Frame[] }).poster_frames = []);
    const sample = () => {
      const frame: Frame = {};
      for (const card of document.querySelectorAll<HTMLElement>("[data-movie-id]")) {
        const { x, y } = card.getBoundingClientRect();
        let opacity = 1;
        for (let node: Element | null = card; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
        frame[card.dataset.movieId!] = { x, y, opacity };
      }
      frames.push(frame);
      if (frames.length < 120) requestAnimationFrame(sample);
    };
    document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(sample));
  });
  await page.goto("/");
  await page.waitForFunction(() => (window as unknown as { poster_frames: unknown[] }).poster_frames.length >= 120);
  const frames = await page.evaluate(
    () => (window as unknown as { poster_frames: Record<string, { x: number; y: number; opacity: number }>[] }).poster_frames
  );

  const first = frames[0];
  const last = frames.at(-1)!;
  const leaving = Object.keys(first).filter((id) => !(id in last));
  const staying = Object.keys(first).filter((id) => id in last);
  expect(leaving.length, "the build-time grid should lose posters 9 hours later").toBeGreaterThan(0);

  // Each leaving poster shows up partly faded in some frame.
  for (const id of leaving)
    expect(
      frames.some((f) => f[id] && f[id].opacity > 0 && f[id].opacity < 1),
      `poster ${id} fades`
    ).toBe(true);

  // Each staying poster that ends up elsewhere glides there through several
  // in-between frames; a jump would go straight from start to end.
  const moved = staying.filter((id) => first[id].x !== last[id].x || first[id].y !== last[id].y);
  expect(moved.length, "the remaining posters should close the gaps").toBeGreaterThan(0);
  for (const id of moved) {
    const in_between = frames.filter((f) => {
      const p = f[id];
      if (!p) return false;
      const at_start = p.x === first[id].x && p.y === first[id].y;
      const at_end = p.x === last[id].x && p.y === last[id].y;
      return !at_start && !at_end;
    }).length;
    expect(in_between, `poster ${id} glides`).toBeGreaterThanOrEqual(5);
  }
});
