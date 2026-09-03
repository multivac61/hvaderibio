<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  import { movie_path_segment } from "$lib/movie-path";
  import type { Movie } from "$lib/schemas";

  type Props = {
    movie: Movie;
    catalog: readonly Movie[];
    index: number;
  };

  const { movie, catalog, index }: Props = $props();
  const movieHref = $derived(resolve(`/movie/${movie_path_segment(movie, catalog)}`));

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
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    void goto(movieHref);
  };
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
  href={movieHref}
  data-movie-id={movie.id}
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  ontouchcancel={() => (touchStart = null)}
  class="movie-poster-card block aspect-2/3 w-full touch-manipulation overflow-visible rounded-lg bg-neutral-900"
  style="-webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; -webkit-user-select: none;">
  <picture>
    <source
      type="image/webp"
      srcset="/{movie.id}-360w.webp 360w, /{movie.id}.webp 720w, /{movie.id}-1080w.webp 1080w"
      sizes="(max-width: 640px) calc(50vw - 2rem), 360px" />
    <img
      src="/{movie.id}.webp"
      alt={movie.title}
      fetchpriority={index < 4 ? "high" : "auto"}
      loading="eager"
      decoding="async"
      width="720"
      height="1080"
      style:view-transition-name="poster-{movie.id}"
      class="movie-poster-image shadow-5xl pointer-events-none h-full w-full rounded-lg object-fill" />
  </picture>
</a>

<style>
  /* iOS Safari can turn a touch into a sticky :hover and require a second tap.
     Keep hover selectors entirely outside coarse-pointer devices. */
  @media (hover: hover) and (pointer: fine) {
    .movie-poster-card:hover {
      z-index: 50;
    }

    .movie-poster-image {
      transition:
        transform 300ms ease-out,
        filter 300ms ease-out,
        box-shadow 300ms ease-out;
    }

    .movie-poster-card:hover .movie-poster-image {
      transform: scale(1.02);
      filter: brightness(1.1);
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    }
  }
</style>
