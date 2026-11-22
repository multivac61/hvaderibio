import type { Attachment } from "svelte/attachments";

/**
 * Keep an image out of sight until it has loaded, so it can fade in whole
 * (style `data-loading:opacity-0` with an opacity transition) rather than pop
 * in or draw in strips while it decodes. One that fails to load stays
 * hidden, leaving whatever is behind it instead of a broken image. Only
 * scripts set the mark, so without them the image shows as usual.
 */
export const reveal_on_load: Attachment<HTMLImageElement> = (img) => {
  if (img.complete) {
    if (img.naturalWidth === 0) img.dataset.loading = "";
    return;
  }
  img.dataset.loading = "";
  const reveal = () => delete img.dataset.loading;
  img.addEventListener("load", reveal, { once: true });
  // Taken off before its image arrived (a poster moved up into the first
  // screen by a new choice, which shows its image as it comes), it must not
  // leave the image hidden with nothing left to reveal it.
  return () => {
    img.removeEventListener("load", reveal);
    reveal();
  };
};
