import { tick } from "svelte";

/**
 * Whether changes should animate as view transitions. Safari on phones
 * butchers them, and visitors who ask for less motion get none.
 */
export function can_view_transition() {
  if (typeof document === "undefined" || !document.startViewTransition) return false;
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768) return false;
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Apply a state change as a view transition where one plays well: elements
 * named on both sides, like posters, move from where they were to where they
 * land, and the rest cross-fades.
 *
 * Changes can come faster than transitions start, as when an arrow key is
 * held. A transition that has not yet applied its change applies the latest
 * one instead, so the last change always lands last; otherwise an older
 * choice could land after a newer one and stick.
 */
let waiting: (() => void) | null = null;

export function with_view_transition(update: () => void) {
  if (!can_view_transition()) return update();
  const already_waiting = waiting !== null;
  waiting = update;
  if (already_waiting) return;
  document.startViewTransition(async () => {
    const latest = waiting;
    waiting = null;
    latest?.();
    await tick();
  });
}
