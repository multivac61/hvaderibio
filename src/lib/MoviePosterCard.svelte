<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { open_on_space } from "#lib/open-on-space.js";
  import { POSTER_SIZES, poster_srcset } from "#lib/poster-image.js";
  import { EAGER_POSTER_COUNT, LEAD_POSTER_COUNT } from "#lib/programme.js";

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

  // The poster leans toward the mouse, as if pressed where it points, and a
  // sheen follows it across. Measured on the link, which never tilts itself.
  const MAX_TILT_DEG = 6;

  const tilt = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--tilt-x", `${((0.5 - y) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${((x - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    card.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
  };

  const untilt = (event: PointerEvent) => {
    const card = event.currentTarget as HTMLElement;
    for (const name of ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y"]) card.style.removeProperty(name);
    for (const other of neighbours(card)) other.style.removeProperty("--glow");
  };

  // Hovering a poster also wakes the glow of the posters around it, each in
  // its own colours, fading with distance as if they caught some of the
  // light. Two poster widths away they stay dark.
  const GLOW_REACH = 2;

  const neighbours = (card: HTMLElement) =>
    [...(card.parentElement?.children ?? [])].filter((other): other is HTMLElement => other !== card && other instanceof HTMLElement);

  const light_neighbours = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const card = event.currentTarget as HTMLElement;
    const centre = (rect: DOMRect) => [rect.left + rect.width / 2, rect.top + rect.height / 2] as const;
    const rect = card.getBoundingClientRect();
    const [x, y] = centre(rect);
    for (const other of neighbours(card)) {
      const [ox, oy] = centre(other.getBoundingClientRect());
      const falloff = 1 - Math.hypot(ox - x, oy - y) / (GLOW_REACH * rect.width);
      if (falloff > 0) other.style.setProperty("--glow", falloff.toFixed(2));
    }
  };
</script>

<a
  href={resolve("/movie/[id]", { id: movie.path })}
  data-movie-id={movie.id}
  onkeydown={open_on_space}
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  ontouchcancel={() => (touchStart = null)}
  onpointerenter={light_neighbours}
  onpointermove={tilt}
  onpointerleave={untilt}
  style:--glow-image="url(/{movie.id}-360w.webp)"
  class="movie-poster-card relative block aspect-2/3 w-full touch-manipulation overflow-visible"
  style="-webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; -webkit-user-select: none;">
  <!-- The poster's own colours, blurred, glow around it. Fetched only when it
       first glows, from the smallest size. -->
  <span aria-hidden="true" class="poster-glow pointer-events-none absolute inset-0 rounded-lg"></span>
  <div class="poster-tilt relative h-full w-full rounded-lg bg-neutral-900">
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
    <span aria-hidden="true" class="poster-glare pointer-events-none absolute inset-0 rounded-lg"></span>
  </div>
</a>

<style>
  /* Quick to respond, then a soft landing: most of the movement happens in
     the first few frames. */
  .poster-tilt {
    transform: perspective(1400px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(var(--lift, 1));
    transition: transform 150ms cubic-bezier(0.2, 0, 0, 1);
  }

  /* Under the mouse it follows almost at once; only settling back is eased. */
  .movie-poster-card:hover .poster-tilt {
    transition-duration: 60ms;
  }

  .movie-poster-image,
  .poster-glow,
  .poster-glare {
    transition:
      opacity 200ms cubic-bezier(0.2, 0, 0, 1),
      filter 150ms cubic-bezier(0.2, 0, 0, 1),
      box-shadow 150ms cubic-bezier(0.2, 0, 0, 1);
  }

  /* --glow runs from 0 (dark) to 1 (hovered). The image is only set while
     it glows, so posters nobody points near never fetch it. */
  .poster-glow {
    opacity: calc(var(--glow, 0) * 0.7);
    background-size: cover;
    filter: blur(28px) saturate(1.6);
    transform: scale(0.94);
  }

  .movie-poster-card[style*="--glow:"] .poster-glow {
    background-image: var(--glow-image);
  }

  .movie-poster-card:hover .poster-tilt,
  .movie-poster-card:focus-visible .poster-tilt {
    z-index: 20;
  }

  .poster-glare {
    opacity: 0;
    background: radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 0%), rgb(255 255 255 / 0.22), transparent 55%);
  }

  /* Keyboard focus gets the hover lift and glow, with the ring drawn on the
     image so it moves along with it. */
  .movie-poster-card:focus-visible {
    outline: none;
    box-shadow: none !important;
  }

  .movie-poster-card:focus-visible .movie-poster-image {
    outline: 2px solid rgb(255 255 255 / 0.9);
    outline-offset: 3px;
  }

  .movie-poster-card:focus-visible,
  .movie-poster-card:hover {
    --lift: 1.03;
  }

  .movie-poster-card:focus-visible .movie-poster-image {
    filter: brightness(1.1);
  }

  .movie-poster-card:focus-visible .poster-glow {
    background-image: var(--glow-image);
    opacity: 0.7;
  }

  /* iOS Safari can turn a touch into a sticky :hover and require a second tap.
     Keep hover selectors entirely outside coarse-pointer devices. */
  @media (hover: hover) and (pointer: fine) {
    .movie-poster-card:hover .movie-poster-image {
      filter: brightness(1.1);
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
    }

    .movie-poster-card:hover .poster-glow {
      background-image: var(--glow-image);
      opacity: 0.7;
    }

    .movie-poster-card:hover .poster-glare {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .poster-tilt {
      transform: none;
    }
  }
</style>
