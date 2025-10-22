<script lang="ts">
  import { IsInViewport } from "runed";
  import { goto } from "$app/navigation";

  interface Props {
    href: string;
    src: string;
    title: string;
    loading?: "eager" | "lazy";
  }

  let { href, src, title, loading = "lazy" }: Props = $props();

  let posterElement = $state<HTMLDivElement>();
  let hasBeenVisible = $state(false);

  const inViewport = new IsInViewport(() => posterElement, {
    threshold: 0.1, // Trigger when 10% of the element is visible
  });

  // Track if element has ever been visible - one-time fade-in
  $effect(() => {
    if (inViewport.current && !hasBeenVisible) {
      hasBeenVisible = true;
    }
  });

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
      goto(href);
    }
  };

  const handleClick = () => {
    // Fallback for non-touch devices
    goto(href);
  };
</script>

<div
  bind:this={posterElement}
  role="button"
  tabindex="0"
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  onclick={handleClick}
  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
  class="group block aspect-[2/3] w-full overflow-visible rounded-lg bg-neutral-900 touch-manipulation transition-opacity duration-700 ease-out [@media(hover:hover)]:hover:z-50"
  class:opacity-0={!hasBeenVisible}
  class:opacity-100={hasBeenVisible}
  style="cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; -webkit-user-select: none;">
  <img
    {src}
    srcset="{src.replace('.webp', '-360w.webp')} 360w, {src} 720w, {src.replace('.webp', '-1080w.webp')} 1080w"
    sizes="(max-width: 640px) 180px, (max-width: 1024px) 360px, 540px"
    {title}
    alt={title}
    {loading}
    decoding="async"
    class="pointer-events-none h-full w-full rounded-lg object-fill shadow-2xl [@media(hover:hover)]:transition-transform [@media(hover:hover)]:duration-200 [@media(hover:hover)]:group-hover:scale-105" />
</div>
