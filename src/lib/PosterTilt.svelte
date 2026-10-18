<script module lang="ts">
  import type { Attachment } from "svelte/attachments";

  // The poster under the mouse leans toward it, as if pressed where it
  // points, and a sheen follows it across. Measured on the card, which never
  // tilts itself.
  const MAX_TILT_DEG = 6;

  // The posters around it glow too, each in its own colours, as if they
  // caught some of the light: fully at their edge, fading out two poster
  // widths away. Crossing to the next poster finds it already glowing.
  const REACH = 2;

  const TILT = ["--tilt-x", "--tilt-y"];

  /**
   * Tilt the poster (`poster-card` around a PosterTilt) under the mouse and
   * light those near it. Attach to the grid, so the glow carries across the
   * gaps between posters; the element may also be a lone card. The class is
   * set in the markup so hover works before the app starts.
   */
  export const poster_tilt: Attachment<HTMLElement> = (field) => {
    // Measured as the mouse comes in and after scrolling, not on every move.
    let placed: { card: HTMLElement; rect: DOMRect }[] | null = null;
    let lit: HTMLElement[] = [];
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    const measure = () => {
      const cards = field.classList.contains("poster-card") ? [field] : [...field.querySelectorAll<HTMLElement>(".poster-card")];
      return cards.map((card) => ({ card, rect: card.getBoundingClientRect() }));
    };

    const update = () => {
      frame = 0;
      if (!pointer) return;
      const { x: px, y: py } = pointer;
      placed ??= measure();
      const now_lit: HTMLElement[] = [];
      for (const { card, rect } of placed) {
        const dx = Math.max(rect.left - px, 0, px - rect.right);
        const dy = Math.max(rect.top - py, 0, py - rect.bottom);
        const glow = 1 - Math.hypot(dx, dy) / (REACH * rect.width);
        if (glow <= 0) continue;
        now_lit.push(card);
        card.dataset.lit = "";
        card.style.setProperty("--glow", glow.toFixed(2));
        if (dx > 0 || dy > 0) {
          for (const name of TILT) card.style.removeProperty(name);
          continue;
        }
        const x = (px - rect.left) / rect.width;
        const y = (py - rect.top) / rect.height;
        card.style.setProperty("--tilt-x", `${((0.5 - y) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${((x - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
        card.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
      }
      for (const card of lit) if (!now_lit.includes(card)) darken(card);
      lit = now_lit;
    };

    // The glare stays where the mouse left it, to fade out there.
    const darken = (card: HTMLElement) => {
      for (const name of ["--glow", ...TILT]) card.style.removeProperty(name);
    };

    // One update a frame, however often the mouse reports.
    const track = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer = { x: event.clientX, y: event.clientY };
      frame ||= requestAnimationFrame(update);
    };

    const leave = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
      placed = null;
      for (const card of lit) darken(card);
      lit = [];
    };

    const remeasure = () => (placed = null);

    const light = (event: FocusEvent) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(".poster-card");
      if (card) card.dataset.lit = "";
    };

    field.addEventListener("focusin", light);
    field.addEventListener("pointermove", track);
    field.addEventListener("pointerleave", leave);
    addEventListener("scroll", remeasure, { passive: true });
    addEventListener("resize", remeasure);
    return () => {
      leave();
      field.removeEventListener("focusin", light);
      field.removeEventListener("pointermove", track);
      field.removeEventListener("pointerleave", leave);
      removeEventListener("scroll", remeasure);
      removeEventListener("resize", remeasure);
    };
  };
</script>

<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    /** Picks the poster whose colours glow around it. */
    id: number | string;
    children: Snippet;
  };

  const { id, children }: Props = $props();
</script>

<!-- The poster's own colours, blurred, glow around it. Fetched only when it
     first glows, from the smallest size. Every layer takes the card's corners. -->
<span
  aria-hidden="true"
  style:--glow-image="url(/{id}-360w.webp)"
  class="poster-glow pointer-events-none absolute inset-0 rounded-[inherit]"></span>
<div class="poster-tilt relative h-full w-full rounded-[inherit] bg-neutral-900">
  {@render children()}
  <span aria-hidden="true" class="poster-glare pointer-events-none absolute inset-0 rounded-[inherit]"></span>
</div>

<style>
  /* Quick to respond, then a soft landing: most of the movement happens in
     the first few frames. */
  .poster-tilt {
    transform: perspective(1400px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(var(--lift, 1));
    transition: transform 150ms cubic-bezier(0.2, 0, 0, 1);
  }

  /* Under the mouse it follows almost at once; only settling back is eased. */
  :global(.poster-card:hover) .poster-tilt {
    transition-duration: 60ms;
  }

  .poster-tilt :global(img),
  .poster-glow,
  .poster-glare {
    transition:
      opacity 200ms cubic-bezier(0.2, 0, 0, 1),
      filter 150ms cubic-bezier(0.2, 0, 0, 1),
      box-shadow 150ms cubic-bezier(0.2, 0, 0, 1);
  }

  /* --glow runs from 0 (dark) to 1 (hovered). The image is only set once a
     card first glows (data-lit), so posters nobody points near never fetch
     it, and then stays so the glow can fade out with its picture. */
  .poster-glow {
    opacity: calc(var(--glow, 0) * 0.7);
    background-size: cover;
    filter: blur(28px) saturate(1.6);
    transform: scale(0.94);
  }

  :global(.poster-card[data-lit]) .poster-glow {
    background-image: var(--glow-image);
  }

  :global(.poster-card:hover) .poster-tilt,
  :global(.poster-card:focus-visible) .poster-tilt {
    z-index: 20;
  }

  .poster-glare {
    opacity: 0;
    background: radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 0%), rgb(255 255 255 / 0.22), transparent 55%);
  }

  /* Keyboard focus gets the hover lift and glow. */
  :global(.poster-card:focus-visible) {
    --lift: 1.03;
  }

  :global(.poster-card:focus-visible) .poster-tilt :global(img) {
    filter: brightness(1.1);
  }

  :global(.poster-card:focus-visible) .poster-glow {
    background-image: var(--glow-image);
    opacity: 0.7;
  }

  /* iOS Safari can turn a touch into a sticky :hover and require a second tap.
     Keep hover selectors entirely outside coarse-pointer devices. */
  @media (hover: hover) and (pointer: fine) {
    :global(.poster-card:hover) {
      --lift: 1.03;
    }

    :global(.poster-card:hover) .poster-tilt :global(img) {
      filter: brightness(1.1);
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
    }

    :global(.poster-card:hover) .poster-glow {
      background-image: var(--glow-image);
      opacity: 0.7;
    }

    :global(.poster-card:hover) .poster-glare {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .poster-tilt {
      transform: none;
    }
  }
</style>
