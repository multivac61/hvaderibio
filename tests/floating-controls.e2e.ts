import { expect, test, type Page } from "@playwright/test";

// The phone bar must sit at the bottom of the screen from the first frame,
// whatever the page holds. Anchored to its content instead, it showed at the
// top while the poster grid waited for the browser's clock, or when a choice
// left nothing to list, and then dropped to the bottom.
const FIXTURE_MORNING = new Date("2026-10-03T09:00:00Z");
// After the fixture's last showtime, so every day lists nothing.
const FIXTURE_OVER = new Date("2026-10-08T09:00:00Z");

async function bar_gap_to_bottom(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((el) => innerHeight - el.getBoundingClientRect().bottom);
}

async function expect_bar_at_bottom(page: Page, selector: string) {
  const gap = await bar_gap_to_bottom(page, selector);
  // Clear of the edge, so Safari's toolbar is not tinted, and resting in
  // the bar's slot rather than pushed up by the content.
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThan(100);
}

test.describe("before the app starts", () => {
  test.use({ javaScriptEnabled: false });

  test("home page shows the bar at the bottom", async ({ page }) => {
    await page.goto("/");
    await expect_bar_at_bottom(page, "#select-cinemas");
  });

  test("movie page shows the bar at the bottom", async ({ page }) => {
    // Without JavaScript the home page lists no posters to follow.
    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    const [movie] = sitemap.match(/\/movie\/[^<]+/) ?? [];
    expect(movie).toBeDefined();
    await page.goto(movie!);
    await expect_bar_at_bottom(page, "#select-cinemas-movie-mobile");
  });

  // The bar names the choice from the first frame, before the app can
  // compute anything: the prerendered pill already says what is listed.
  test("the bar names the chosen day and cinema", async ({ page }) => {
    await page.goto("/");
    const pill = page.locator("#select-cinemas");
    await expect(pill).toContainText("Í dag");
    await expect(pill).toContainText("Höfuðborgarsvæðið");
  });
});

test("home page keeps the bar in place as the posters arrive", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  await expect_bar_at_bottom(page, "#select-cinemas");
});

test("home page keeps the bar at the bottom when nothing is showing", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_OVER);
  await page.goto("/");
  await expect(page.getByText("Prófaðu að velja annan dag")).toBeVisible();
  await expect_bar_at_bottom(page, "#select-cinemas");
});

test("home page fades the bar in once the app starts, as scrolling up does", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  // Record the bar's opacity every frame from the first paint until the fade
  // ends. A fixed frame budget ran out mid-fade when a slow runner started
  // the app late, leaving the last sample short of 1 for good.
  await page.addInitScript(() => {
    const seen: number[] = [];
    Object.assign(window, { bar_opacity: seen });
    const sample = () => {
      const pill = document.querySelector("#select-cinemas");
      if (pill) seen.push(Number(getComputedStyle(pill).opacity));
      if (seen.at(-1) !== 1 && performance.now() < 20_000) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => (window as unknown as { bar_opacity: number[] }).bar_opacity.at(-1))).toBe(1);
  const seen = await page.evaluate(() => (window as unknown as { bar_opacity: number[] }).bar_opacity);
  expect(seen[0]).toBe(0);
  // Faded, not switched on: some frames fall in between.
  expect(seen.some((opacity) => opacity > 0 && opacity < 1)).toBe(true);
});

// The pill opens a sheet holding both choices; a cinema finishes the choice
// and closes it.
test("home page picks a cinema from the bar's sheet", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  const pill = page.locator("#select-cinemas");
  await pill.tap();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("radio", { name: "Bíó Paradís" }).tap();
  await expect(sheet).toHaveCount(0);
  await expect(pill).toContainText("Bíó Paradís");
});

// The sheet goes back the way it came: pulled down far enough, it closes;
// a short pull springs back. (A mouse drag: WebKit here cannot fake a
// touch drag, but the sheet takes any pointer.)
test("pulling the sheet down closes it", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await page.locator("#select-cinemas").tap();
  const sheet = page.getByRole("dialog");
  // A finger takes hold once the sheet has risen, not while it moves.
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0);
  const pull = async (distance: number) => {
    const box = (await sheet.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + 20;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let step = 1; step <= 20; step++) {
      await page.mouse.move(x, y + (distance * step) / 20);
      await page.waitForTimeout(16);
    }
    // Hold still, so the release is not a flick.
    await page.waitForTimeout(150);
    await page.mouse.up();
  };
  await pull(40);
  await page.waitForTimeout(400);
  await expect(sheet).toBeVisible();
  await pull(320);
  await expect(sheet).toHaveCount(0);
});

// As the sheet rises, the page behind it steps back: it shrinks a little
// towards the top of the screen, onto black, with rounded corners, the way
// iOS stacks a sheet over what it came from. It follows a pull on the sheet
// and returns to itself as the sheet goes.
test("the page steps back behind the sheet and returns when it closes", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  // Read down the page, then back up a little to bring the bar.
  await read_down(page);
  const y = await page.evaluate(() => scrollY);
  for (const step of [20, 40, 60]) {
    await page.evaluate((y) => scrollTo(0, y), y - step);
    await page.waitForTimeout(30);
  }
  await expect(page.locator("#select-cinemas")).toHaveCSS("opacity", "1");
  const stage = page.locator("[data-sheet-stage]");
  const look = () =>
    stage.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        scale: style.scale === "none" ? 1 : Number(style.scale),
        clip: style.clipPath,
        sky: getComputedStyle(document.documentElement).backgroundImage,
      };
    });
  expect((await look()).scale).toBe(1);

  await page.locator("#select-cinemas").tap();
  const sheet = page.getByRole("dialog");
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0);
  await expect.poll(async () => (await look()).scale).toBeLessThan(0.95);
  const pushed = await look();
  expect(pushed.clip).toContain("round");
  expect(pushed.sky).toBe("none");
  // Shrunk towards the top of the screen: the top edge stays in view.
  const top = await stage.evaluate((el) => {
    // The visible card's top: the clipped edge, where the page is scaled.
    const inset = Number(/inset\(([\d.]+)px/.exec(getComputedStyle(el).clipPath)![1]);
    return el.getBoundingClientRect().top + inset * Number(getComputedStyle(el).scale);
  });
  expect(top).toBeGreaterThan(0);
  expect(top).toBeLessThan(40);

  // Half a pull brings it half way back.
  const box = (await sheet.boundingBox())!;
  const x = box.x + box.width / 2;
  const grip = box.y + 20;
  await page.mouse.move(x, grip);
  await page.mouse.down();
  for (let step = 1; step <= 10; step++) {
    await page.mouse.move(x, grip + (box.height * 0.3 * step) / 10);
    await page.waitForTimeout(16);
  }
  const pulled = (await look()).scale;
  expect(pulled).toBeGreaterThan(pushed.scale);
  expect(pulled).toBeLessThan(1);
  await page.waitForTimeout(150);
  await page.mouse.up();

  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect.poll(async () => (await look()).scale).toBe(1);
  // The clip and the sky are handed back once the page has fully returned,
  // a frame after it reaches its size.
  await expect.poll(async () => (await look()).clip).toBe("none");
  expect((await look()).sky).not.toBe("none");
});

// A finger that moves the sheet and lets go sends no click, unlike a mouse.
// The sheet swallowed the click it expected after every drag, so on iOS the
// next real tap, on a day or a cinema, was eaten and had to be made twice.
test("one tap chooses after the sheet was nudged", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await page.locator("#select-cinemas").tap();
  const sheet = page.getByRole("dialog");
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0);
  // A touch drag of 30px that springs back: pointer events, and no click.
  await sheet.evaluate(async (el) => {
    const box = el.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + 20;
    const send = (type: string, dy: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 7,
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: y + dy,
          bubbles: true,
        })
      );
    send("pointerdown", 0);
    for (let dy = 5; dy <= 30; dy += 5) {
      send("pointermove", dy);
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    send("pointerup", 30);
  });
  await page.waitForTimeout(400);
  await sheet.getByRole("radio", { name: "Á morgun", exact: true }).tap();
  await expect(sheet.getByRole("radio", { name: "Á morgun", exact: true })).toBeChecked();
});

// The page steps back by moving and scaling, which the phone hands to its
// GPU. Its rounded clip lands at once: Safari repaints a clip every frame
// it animates, here a page the length of the whole programme.
test("the page behind the sheet animates only on the GPU", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await page.locator("#select-cinemas").tap();
  const stage = page.locator("[data-sheet-stage]");
  await expect.poll(() => stage.evaluate((el) => getComputedStyle(el).clipPath)).toContain("round");
  const animated = await stage.evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(animated).not.toContain("clip-path");
});

// Changing the day keeps the posters both days share: the same images,
// already decoded, rather than the whole grid built again and every poster
// blank until its image decodes anew, which read as the page reloading.
test("a poster showing on both days stays put when the day changes", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  await page.locator("img.movie-poster-image").evaluateAll((images) => {
    for (const image of images) (image as HTMLImageElement & { kept?: boolean }).kept = true;
  });
  await page.locator("#select-cinemas").tap();
  await page.getByRole("dialog").getByRole("radio", { name: "Mánudag", exact: true }).tap();
  await expect(page.getByRole("dialog").getByRole("radio", { name: "Mánudag", exact: true })).toBeChecked();
  const kept = await page
    .locator("img.movie-poster-image")
    .evaluateAll((images) => images.map((image) => (image as HTMLImageElement & { kept?: boolean }).kept === true));
  expect(kept.length).toBeGreaterThan(0);
  expect(kept.every(Boolean)).toBe(true);
});

// Stepped back behind the sheet, the page is clipped to the screen. A day
// chosen in the sheet changes the page's length underneath; the card must
// keep its shape, still reaching down behind the sheet.
test("the stepped-back page keeps its shape when the page's length changes", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  await page.locator("#select-cinemas").tap();
  const sheet = page.getByRole("dialog");
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0);
  const stage = page.locator("[data-sheet-stage]");
  // Where the clipped card's bottom edge lands on screen, found by asking
  // what is drawn just above and below it.
  const card_bottom = () =>
    stage.evaluate((el) => {
      for (let y = innerHeight - 1; y > 0; y--) {
        if (document.elementsFromPoint(innerWidth / 2, y).some((node) => el.contains(node) && node !== el)) return y;
      }
      return 0;
    });
  await expect.poll(() => stage.evaluate((el) => Number(getComputedStyle(el).scale))).toBeLessThan(0.95);
  const before = await card_bottom();
  // A shorter page: say a day with fewer rows of posters.
  await stage.evaluate((el) => {
    const rows = el.querySelector<HTMLElement>("a[data-movie-id]")!.parentElement!;
    rows.style.height = "300px";
    rows.style.overflow = "hidden";
  });
  await page.waitForTimeout(100);
  expect(Math.abs((await card_bottom()) - before)).toBeLessThan(2);
});

// A new cinema is a new list, so the page goes back to its top. It does so
// at once, behind the sheet, while the sheet still covers the page; the sheet
// then leaves onto the top of the new list. Scrolling up after the sheet
// had gone stacked a third movement on the sheet and the grid.
test("phone: choosing a cinema goes back to the top of the list behind the sheet", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  await read_down(page);
  const y = await page.evaluate(() => scrollY);
  for (const step of [20, 40, 60]) {
    await page.evaluate((y) => scrollTo(0, y), y - step);
    await page.waitForTimeout(30);
  }
  await expect(page.locator("#select-cinemas")).toHaveCSS("opacity", "1");
  await page.locator("#select-cinemas").tap();
  await page.getByRole("dialog").getByRole("radio", { name: "Bíó Paradís", exact: true }).tap();
  // Back at the top while the sheet is still on its way down.
  await expect.poll(() => page.evaluate(() => [scrollY, document.querySelectorAll("[role=dialog]").length])).toEqual([0, 1]);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

// While the sheet is up the page behind it is stepped back, scaled: the
// grid cannot glide there (its moves are measured on screen, where the
// scale threw them off and the posters jumped). It changes at once, behind
// the sheet.
test("phone: a day chosen in the sheet changes the grid without gliding", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  await page.locator("#select-cinemas").tap();
  const sheet = page.getByRole("dialog");
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.evaluate(() => {
    const record = window as unknown as { moved: number };
    record.moved = 0;
    const watch = () => {
      for (const animation of document.getAnimations()) {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        if (target instanceof Element && target.querySelectorAll("a[data-movie-id]").length === 1) record.moved++;
      }
      requestAnimationFrame(watch);
    };
    watch();
  });
  await sheet.getByRole("radio", { name: "Þriðjudag", exact: true }).tap();
  await expect(sheet.getByRole("radio", { name: "Þriðjudag", exact: true })).toBeChecked();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { moved: number }).moved)).toBe(0);
});

// Let go past the point of closing, the sheet keeps moving: every frame
// after the release finds it lower than the one before, until it is gone.
// A frame where it stands still and then leaps reads as a stutter.
test("a sheet let go to close never stands still on its way down", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await page.locator("#select-cinemas").tap();
  const sheet = page.getByRole("dialog");
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0);
  await sheet.evaluate((el) => {
    const record = window as unknown as { tops: number[] };
    record.tops = [];
    addEventListener(
      "pointerup",
      () => {
        const sample = () => {
          if (!el.isConnected || record.tops.length >= 12) return;
          record.tops.push(el.getBoundingClientRect().top);
          requestAnimationFrame(sample);
        };
        sample();
      },
      { capture: true, once: true }
    );
  });
  const box = (await sheet.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + 20;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 20; step++) {
    await page.mouse.move(x, y + (320 * step) / 20);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(sheet).toHaveCount(0);
  const tops = await page.evaluate(() => (window as unknown as { tops: number[] }).tops);
  const onscreen = tops.filter((top) => top < 844);
  expect(onscreen.length).toBeGreaterThan(2);
  // Once it starts down, every frame is lower than the last, with no leap
  // over a large part of the way at once. (A busy engine may hold a
  // transition at its start for a frame or two; the stutter this guards
  // against stood still, leapt half the way in one frame, then crept back
  // up.)
  const first_move = onscreen.findIndex((top) => top !== onscreen[0]);
  const moving = onscreen.slice(Math.max(0, first_move - 1));
  const distance = 844 - onscreen[0]!;
  const steps = moving.slice(1).map((top, i) => top - moving[i]!);
  expect(steps.filter((step) => step <= 0)).toEqual([]);
  expect(steps.filter((step) => step > distance * 0.4)).toEqual([]);
});

// Scroll down the way a reader does, in steps, stopping midway.
async function read_down(page: Page) {
  const middle = await page.evaluate(() => (document.documentElement.scrollHeight - innerHeight) / 2);
  for (let y = 60; y <= middle; y += 60) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(30);
  }
}

// Closing the sheet hands focus back to the pill. The bar stayed up for
// good after that, since it stays up while focus is inside it, and covered
// the posters it is meant to make way for.
test("home page still tucks the bar away after the sheet was used", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  await page.locator("#select-cinemas").tap();
  await page.getByRole("dialog").getByRole("radio", { name: "Öll", exact: true }).tap();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await read_down(page);
  await expect(page.locator("#select-cinemas")).toHaveCSS("opacity", "0");
});

// Reaching the end of the page leaves the bar tucked away; only scrolling
// back up brings it. Once back, the last row has room to clear it.
test("home page brings the bar back only when scrolling up", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  const pill = page.locator("#select-cinemas");
  await read_down(page);
  await expect(pill).toHaveCSS("opacity", "0");
  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = Math.ceil(bottom / 2); y <= bottom; y += 60) {
    await page.evaluate((y) => scrollTo(0, y), Math.min(y, bottom));
    await page.waitForTimeout(30);
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  await expect(pill).toHaveCSS("opacity", "0");

  // A nudge up is not yet a return: a reader settling the page.
  await page.evaluate((y) => scrollTo(0, y), bottom - 10);
  await page.waitForTimeout(400);
  await expect(pill).toHaveCSS("opacity", "0");

  for (const step of [20, 40, 60]) {
    await page.evaluate((y) => scrollTo(0, y), bottom - step);
    await page.waitForTimeout(30);
  }
  await expect(pill).toHaveCSS("opacity", "1");

  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const last = await page
    .locator('a[href^="/movie/"]')
    .last()
    .evaluate((el) => el.getBoundingClientRect().bottom);
  const bar = await pill.evaluate((el) => el.getBoundingClientRect().top);
  expect(last).toBeLessThanOrEqual(bar);
});

// The bar belongs to the bottom edge, so it tucks down towards it and comes
// back up from it, rather than shrinking in place. Never onto the edge
// itself (see safari-toolbar.e2e.ts). Asked for less motion, it only fades.
test("home page tucks the bar down towards the bottom edge", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  const pill = page.locator("#select-cinemas");
  await expect(pill).toHaveCSS("opacity", "1");
  const motion = () =>
    pill.evaluate((el) => {
      const style = getComputedStyle(el);
      return { translate: style.translate, scale: style.scale, bottom: el.getBoundingClientRect().bottom };
    });
  const shown = await motion();
  await read_down(page);
  await expect(pill).toHaveCSS("opacity", "0");
  const tucked = await motion();
  expect(tucked.scale).toBe("none");
  expect(tucked.translate).toMatch(/^0px [1-9]\d*px$/);
  expect(tucked.bottom).toBeGreaterThan(shown.bottom);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => (await motion()).translate).toBe("none");
});

// The pill is frosted glass. Faded as part of the row around it, it lost
// what lies behind it for the whole fade (a faded ancestor is a backdrop
// root) and flickered from frosted to clear and back, so the pill fades
// itself and nothing around it does.
test("home page keeps the pill frosted while it fades", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  const pill = page.locator("#select-cinemas");
  await expect(pill).toHaveCSS("opacity", "1");
  await pill.evaluate((el) => {
    const record = window as unknown as { faded_around: string[] };
    record.faded_around = [];
    const sample = () => {
      for (let node = el.parentElement; node; node = node.parentElement) {
        if (Number(getComputedStyle(node).opacity) < 1) record.faded_around.push(node.tagName);
      }
      if (Number(getComputedStyle(el).opacity) > 0) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await read_down(page);
  await expect(pill).toHaveCSS("opacity", "0");
  expect(await page.evaluate(() => (window as unknown as { faded_around: string[] }).faded_around)).toEqual([]);
});

// The bar's row spans the screen, but only its pill is a control: a tap
// beside the pill belongs to the poster underneath.
test("home page lets taps beside the bar's pill reach the posters", async ({ page }) => {
  await page.clock.setFixedTime(FIXTURE_MORNING);
  await page.goto("/");
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();
  await expect(page.locator("#select-cinemas")).toHaveCSS("opacity", "1");
  const pill = (await page.locator("#select-cinemas").boundingBox())!;
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest("a[data-movie-id], [data-floating-bar]")?.tagName,
    {
      x: pill.x - 16,
      y: pill.y + pill.height / 2,
    }
  );
  expect(hit).toBe("A");
});
