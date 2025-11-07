<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  interface Props {
    href: string;
    src: string;
    title: string;
    loading?: "eager" | "lazy";
    fetchpriority?: "high" | "low" | "auto";
  }

  let { href, src, title, loading = "lazy", fetchpriority = "auto" }: Props = $props();

  // Use programmatic navigation to bypass iOS Safari tap issues
  let touchStartY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    // Only navigate if it wasn't a scroll (touch moved less than 10px)
    const touchEndY = e.changedTouches[0].clientY;
    if (Math.abs(touchEndY - touchStartY) < 10) {
      e.preventDefault(); // Prevent the click event from firing
      goto(resolve(href));
    }
  };

  const handleClick = () => {
    // Fallback for non-touch devices
    goto(resolve(href));
  };
</script>

<div
  role="button"
  tabindex="0"
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  onclick={handleClick}
  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
  class="group block aspect-[2/3] w-full touch-manipulation overflow-visible rounded-lg bg-neutral-900 [@media(hover:hover)]:hover:z-50"
  style="cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; -webkit-user-select: none;">
  <picture>
    <source
      type="image/webp"
      srcset="{src.replace('.webp', '-360w.webp')} 360w, {src} 720w, {src.replace('.webp', '-1080w.webp')} 1080w"
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 360px, 360px" />
    <img
      {src}
      {title}
      alt={title}
      {loading}
      {fetchpriority}
      decoding="async"
      width="720"
      height="1080"
      class="pointer-events-none h-full w-full rounded-lg object-fill shadow-2xl [@media(hover:hover)]:transition-transform [@media(hover:hover)]:duration-300 [@media(hover:hover)]:ease-out [@media(hover:hover)]:group-hover:scale-[1.02]" />
  </picture>
</div>
