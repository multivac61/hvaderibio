import { expect, test, type Page } from "@playwright/test";

// iOS Safari tints its toolbar from fixed and sticky elements at the bottom
// edge of the viewport, painting a solid band behind the URL bar instead of
// letting the posters run under it with Safari's own blur. Opacity and
// visibility do not stop it, and no automated browser draws that toolbar, so
// check the rule instead: nothing fixed or sticky may reach the bottom edge.
async function bottom_edge_offenders(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const describe = (el: Element) => `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""} class="${el.getAttribute("class") ?? ""}">`;
    const offenders: string[] = [];
    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      if (style.position !== "fixed" && style.position !== "sticky") continue;
      if (style.display === "none") {
        // A hidden element styled to cover the bottom edge brought the band
        // back on movie pages (the closed trailer dialog).
        if (style.bottom === "0px" && style.backgroundColor !== "rgba(0, 0, 0, 0)") offenders.push(describe(el));
        continue;
      }
      for (const node of [el, ...el.querySelectorAll("*")]) {
        const reaches_edge = [...node.getClientRects()].some((r) => r.width > 0 && r.height > 0 && r.bottom > innerHeight - 1);
        if (reaches_edge) offenders.push(describe(node));
      }
    }
    return offenders;
  });
}

// Scroll down in steps the way a reader does, so the floating controls tuck
// away. Stop midway: they come back at the top and bottom of the page. Mobile
// WebKit has no mouse wheel to drive this.
async function scroll_down(page: Page) {
  const middle = await page.evaluate(() => (document.documentElement.scrollHeight - innerHeight) / 2);
  for (let y = 60; y <= middle; y += 60) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(30);
  }
}

// How opaque an element ends up once its ancestors' opacity is applied.
async function effective_opacity(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((el) => {
    let opacity = 1;
    for (let node: Element | null = el; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return opacity;
  });
}

for (const { name, path, controls } of [
  { name: "home", path: "/", controls: "#select-cinemas" },
  { name: "movie", path: null, controls: "#select-cinemas-movie-mobile" },
]) {
  test(`${name} page keeps fixed and sticky elements off the bottom edge`, async ({ page }) => {
    await page.goto("/");
    if (path === null) {
      await page.locator('a[href^="/movie/"]').first().click();
      await page.waitForURL(/\/movie\//);
    }
    await expect(page.locator(controls)).toBeVisible();
    expect(await bottom_edge_offenders(page)).toEqual([]);

    await scroll_down(page);
    // Wait out the fade, however the controls are hidden.
    await expect.poll(() => effective_opacity(page, controls)).toBe(0);
    expect(await bottom_edge_offenders(page)).toEqual([]);
  });
}
