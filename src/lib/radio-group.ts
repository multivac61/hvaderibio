/**
 * The keyboard of a radio group drawn with buttons: one tab stop, on the
 * chosen button, and the arrow keys move the choice and wrap at the ends,
 * as native radio buttons do. Without it, reaching the fourth day by Tab
 * took a press for every control on the way.
 *
 * Native inputs would give this for free, but the buttons' own boxes are
 * what the pill, the touch targets and the 320px layout are measured from.
 */
export function next_radio(key: string, index: number, count: number): number | undefined {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return index <= 0 ? count - 1 : index - 1;
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
}

/**
 * Moves the choice, and focus and the tab stop with it, to a sibling `role="radio"` button in
 * the same radiogroup. It steps from the focused button, not from the chosen
 * value: a choice runs as a view transition, so a second press can arrive
 * before the value has changed.
 */
export function on_radio_keydown<T>(
  event: KeyboardEvent & { currentTarget: HTMLElement },
  choices: readonly T[],
  choose: (choice: T) => void
) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const radios = [...(event.currentTarget.closest('[role="radiogroup"]')?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])];
  const next = next_radio(event.key, radios.indexOf(event.currentTarget), choices.length);
  if (next === undefined) return;
  event.preventDefault();
  // The tab stop goes with focus now, not when the choice lands: a Tab in
  // between would otherwise leave the group from the new button and come
  // back to the old one. The chosen value sets the same tabindex once it
  // arrives.
  for (const [i, radio] of radios.entries()) radio.tabIndex = i === next ? 0 : -1;
  radios[next]?.focus();
  choose(choices[next]!);
}
