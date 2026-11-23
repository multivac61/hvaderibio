import type { Page } from "@playwright/test";

/**
 * Scroll to y and wait until the page has seen the scroll, so it reads each
 * step as a scroll of its own. A busy WebKit moves the page at once but holds
 * its scroll event back, through several frames: steps waited out by frames
 * reached the page merged, as one scroll the other way.
 */
export async function scroll_step(page: Page, y: number) {
  await page.evaluate(async (y) => {
    const seen = new Promise((resolve) => addEventListener("scroll", resolve, { once: true }));
    const before = scrollY;
    scrollTo(0, y);
    if (scrollY !== before) await seen;
  }, y);
}
