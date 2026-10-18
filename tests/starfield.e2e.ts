import { expect, test } from "@playwright/test";

// A still night sky lies behind every page: the page's own background, so
// nothing fixed reaches the bottom edge (see safari-toolbar.e2e.ts).
for (const path of ["/", "/movie/verity"]) {
  test(`${path}: stars lie behind the page`, async ({ page }) => {
    await page.goto(path);
    const background = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement);
      return { image: html.backgroundImage, attachment: html.backgroundAttachment, body: getComputedStyle(document.body).backgroundColor };
    });
    // Phones get the smaller tile.
    const phone = (page.viewportSize()?.width ?? 0) < 768;
    expect(background.image).toMatch(phone ? /^url\(".+stars-small.*\.webp"\)$/ : /^url\(".+\/stars\.[^/]*webp"\)$/);
    expect(background.attachment).toBe("fixed");
    // Nothing between the sky and the page hides it.
    expect(background.body).toBe("rgba(0, 0, 0, 0)");

    // Some stars, but mostly dark sky.
    const lit = await page.evaluate(async (image) => {
      const img = new Image();
      img.src = image.slice(5, -2);
      await img.decode();
      const canvas = document.createElement("canvas");
      [canvas.width, canvas.height] = [img.naturalWidth, img.naturalHeight];
      const context = canvas.getContext("2d")!;
      context.drawImage(img, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] > 60) count++;
      return count / (canvas.width * canvas.height);
    }, background.image);
    expect(lit).toBeGreaterThan(0.0005);
    expect(lit).toBeLessThan(0.05);
  });
}
