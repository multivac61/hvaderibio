<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { open_on_space } from "#lib/open-on-space.js";
  import { POSTER_SIZES, poster_srcset } from "#lib/poster-image.js";
  import { EAGER_POSTER_COUNT, LEAD_POSTER_COUNT } from "#lib/programme.js";
  import PosterTilt from "#lib/PosterTilt.svelte";

  import type { ProgrammeEntry } from "#lib/programme.js";

  type Props = {
    movie: Pick<ProgrammeEntry, "id" | "title" | "path">;
    index: number;
  };

  const { movie, index }: Props = $props();

  let touchStart: { x: number; y: number } | null = null;

  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    if (!touchStart || !touch) return;

    const movement = Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y);
    touchStart = null;
    if (movement >= 10) return;

    // iOS Safari can retain the previously tapped link's hover state after
    // history navigation and consume the next synthetic click. Navigate from
    // the real touch event instead; preventDefault suppresses the later click.
    event.preventDefault();
    void goto(resolve("/movie/[id]", { id: movie.path }));
  };
</script>

<a
  href={resolve("/movie/[id]", { id: movie.path })}
  data-movie-id={movie.id}
  onkeydown={open_on_space}
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  ontouchcancel={() => (touchStart = null)}
  class="movie-poster-card poster-card relative block aspect-2/3 w-full touch-manipulation overflow-visible rounded-lg"
  style="-webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; -webkit-user-select: none;">
  <PosterTilt id={movie.id}>
    <picture>
      <source type="image/webp" srcset={poster_srcset(movie.id)} sizes={POSTER_SIZES} />
      <img
        src="/{movie.id}.webp"
        alt={movie.title}
        fetchpriority={index < LEAD_POSTER_COUNT ? "high" : "low"}
        loading={index < EAGER_POSTER_COUNT ? "eager" : "lazy"}
        decoding="async"
        width="720"
        height="1080"
        style:view-transition-name="poster-{movie.id}"
        class="movie-poster-image pointer-events-none relative h-full w-full rounded-lg object-fill" />
    </picture>
  </PosterTilt>
</a>

<style>
  /* Keyboard focus draws its ring on the image so it moves along with it. */
  .movie-poster-card:focus-visible {
    outline: none;
    box-shadow: none !important;
  }

  .movie-poster-card:focus-visible .movie-poster-image {
    outline: 2px solid rgb(255 255 255 / 0.9);
    outline-offset: 3px;
  }
</style>
