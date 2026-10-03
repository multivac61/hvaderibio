// Whether the visitor is navigating with the keyboard, judged by their most
// recent input, the same heuristic browsers use for :focus-visible. Pages use
// it to move focus somewhere useful after a keyboard-driven navigation
// without stealing focus from mouse and touch users.
let keyboard = false;

export const is_keyboard_navigation = () => keyboard;

export function track_input_modality() {
  const on_key = (event: KeyboardEvent) => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey) keyboard = true;
  };
  const on_pointer = () => {
    keyboard = false;
  };
  window.addEventListener("keydown", on_key, true);
  window.addEventListener("pointerdown", on_pointer, true);
  return () => {
    window.removeEventListener("keydown", on_key, true);
    window.removeEventListener("pointerdown", on_pointer, true);
  };
}
