import { expect, type Page } from "@playwright/test";

/**
 * Open the home page and wait until it has hydrated. The posters are in the
 * prerendered HTML, so a tap before then is a full page load rather than a
 * client-side navigation. The page fills its status line once mounted.
 */
export async function goto_hydrated_home(page: Page) {
  await page.goto("/");
  await expect(page.locator('p[role="status"]')).not.toBeEmpty();
}
