const sharp = { filter: "blur(0px)", opacity: 1 };
const hidden = { filter: "blur(48px)", opacity: 0 };

/**
 * Blur `element` out of sight, run `swap` while nothing of it shows, then
 * sharpen it back. Posters that change places are never seen moving: a
 * visible jump or slide across the grid is disorienting.
 */
export async function blur_swap(element: HTMLElement, swap: () => Promise<void>) {
  const out = element.animate([sharp, { filter: "blur(24px)", opacity: 0.5, offset: 0.55 }, { ...hidden, offset: 0.8 }, hidden], {
    duration: 340,
    easing: "ease-in",
    fill: "forwards",
  });
  await out.finished;
  await swap();
  // Give the screen a few frames to catch up with the finished blur, and let
  // posters new to the grid decode so none pops in after it sharpens.
  const decoded = [...element.querySelectorAll("img")].map((img) => img.decode().catch(() => {}));
  await Promise.all([...decoded, new Promise((resolve) => setTimeout(resolve, 90))]);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const back = element.animate([hidden, { filter: "blur(24px)", opacity: 0.5, offset: 0.45 }, sharp], {
    duration: 420,
    easing: "ease-out",
  });
  out.cancel();
  await back.finished;
}
