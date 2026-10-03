/**
 * Let Space open a link, as it presses a button. Posters and "Til baka" act
 * as buttons, so keyboard visitors reach for either key. While such a link
 * has focus, Space no longer scrolls the page; arrows and Page Down still do.
 */
export function open_on_space(event: KeyboardEvent) {
  if (event.key !== " " || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  (event.currentTarget as HTMLElement).click();
}
