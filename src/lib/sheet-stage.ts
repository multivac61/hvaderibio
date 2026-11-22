// The page behind a phone's sheet steps back as the sheet rises, the way
// iOS stacks a sheet over what it came from: it shrinks a little towards
// the top of the screen and drops, its corners round, and black shows
// around it. A pull on the sheet brings it part way back, and it returns to
// itself as the sheet goes.
//
// The page is longer than the screen, so its own corners are nowhere near
// what the visitor sees: it is clipped to the screen, and the clip is what
// rounds. It shrinks about the top of the screen, not of the document.
//
// The stage is the element marked data-sheet-stage (app.html's <main>);
// the sheet itself is portalled outside it.

const CURVE = "cubic-bezier(0.32, 0.72, 0, 1)";
const SIDE = 13; // px it gives up on each side
const DROP = 14; // px it drops from the top of the screen
const RADIUS = 12;

let stage: { el: HTMLElement } | null = null;
let generation = 0;

// Clip and scale the stepped-back page about the top of the screen, with the
// page scrolled `top` down.
const frame_at = (el: HTMLElement, top: number) => {
  el.style.transformOrigin = `50% ${top}px`;
  // A day chosen in the sheet changes the page underneath it. Held at
  // least down to the bottom of the screen, the page cannot shrink out
  // from under the card (or pull the scroll position with it), and the
  // clip measured from that point keeps the card's shape.
  el.style.minHeight = `${top + innerHeight}px`;
  el.style.clipPath = `inset(${top}px 0 calc(100% - ${top + innerHeight}px) 0 round ${RADIUS}px)`;
};

/**
 * Bring the page to its top. Behind a sheet it goes at once, the card
 * framing the new top in the same frame, so the sheet leaves onto it;
 * otherwise it scrolls there.
 */
export function to_top() {
  if (!stage) {
    scroll_when_free();
    return;
  }
  scrollTo({ top: 0, behavior: "instant" });
  frame_at(stage.el, Math.max(0, scrollY - stage.el.offsetTop));
}

// bits-ui hands the page its scrolling back a moment after a sheet, and that
// hand-over stops a smooth scroll already under way.
const scroll_when_free = (frames = 60) => {
  if (document.body.style.overflow === "hidden" && frames > 0) {
    requestAnimationFrame(() => scroll_when_free(frames - 1));
    return;
  }
  scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
};

// Only scale and translate move, which the phone hands to its GPU. The
// rounded clip lands at once: Safari repaints a clip on every frame it
// animates, here a page the length of the whole programme, and at full size
// its corners sit in the screen's own rounded corners, where they do not show.
const transition = (ms: number) => `scale ${ms}ms ${CURVE}, translate ${ms}ms ${CURVE}`;

// progress 0 is the page as it is, 1 fully stepped back.
const set = (progress: number) => {
  if (!stage) return;
  const { el } = stage;
  el.style.scale = String(1 - ((2 * SIDE) / innerWidth) * progress);
  el.style.translate = `0 ${DROP * progress}px`;
};

/** The sheet has opened: step the page back over `ms`. */
export function push_stage(ms = 500) {
  const el = document.querySelector<HTMLElement>("[data-sheet-stage]");
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  generation++;
  if (!stage) {
    stage = { el };
    frame_at(el, Math.max(0, scrollY - el.offsetTop));
    document.documentElement.dataset.sheetPushed = "";
    el.style.transition = "none";
    set(0);
    // The resting values land first, so the step back animates from them.
    void el.getBoundingClientRect();
  }
  el.style.transition = transition(ms);
  set(1);
}

/** A finger is on the sheet: the page follows it, 1 stepped back. */
export function follow_stage(progress: number) {
  if (!stage) return;
  stage.el.style.transition = "none";
  set(Math.min(1, Math.max(0, progress)));
}

/** The sheet is going: bring the page back over `ms`, then let it go. */
export function release_stage(ms = 300) {
  if (!stage) return;
  const { el } = stage;
  const mine = ++generation;
  el.style.transition = transition(ms);
  set(0);
  const done = () => {
    // A sheet opened again in the meantime keeps the page.
    if (mine !== generation || !stage) return;
    el.removeEventListener("transitionend", on_end);
    for (const property of ["scale", "translate", "clip-path", "min-height", "transform-origin", "transition"])
      el.style.removeProperty(property);
    delete document.documentElement.dataset.sheetPushed;
    stage = null;
  };
  const on_end = (event: TransitionEvent) => {
    if (event.target === el && event.propertyName === "scale") done();
  };
  el.addEventListener("transitionend", on_end);
  setTimeout(done, ms + 100);
}
