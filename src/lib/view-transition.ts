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
 */
export function with_view_transition(update: () => void) {
  if (!can_view_transition()) return update();
  document.startViewTransition(async () => {
    update();
    await tick();
  });
}
