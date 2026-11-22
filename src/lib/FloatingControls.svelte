<script lang="ts">
  import type { CinemaOption } from "#lib/cinemas.js";
  import ProgrammeControls from "#lib/ProgrammeControls.svelte";
  import { onMount } from "svelte";

  type Props = {
    cinemaOptions: readonly CinemaOption[];
    id?: string;
  };

  const { cinemaOptions, id = "select-cinemas" }: Props = $props();

  // The phone control bar floats over the content; it tucks away while the
  // visitor scrolls down to read, and comes back only when they scroll back
  // up (a deliberate stretch, not a settling nudge) or reach the top. The end
  // of the page does not bring it back: the reader got there going down. It
  // must not move down: iOS Safari tints its toolbar from whatever touches
  // the bottom edge, so even a transparent bar nudged onto it paints a black
  // band behind the URL bar. Tucked, it drops a little towards the edge,
  // never onto it.
  //
  // It is fixed rather than sticky: a sticky bar cannot leave its parent, so
  // while the posters waited for the clock, or a choice left nothing to list,
  // it sat near the top of a short page and then dropped to the bottom.
  //
  // The page is prerendered with the bar hidden, and once the app runs it
  // fades in the way it returns on scrolling up. Without scripts it shows
  // from the start.
  let hidden = $state(true);
  let bar: HTMLElement | undefined = $state();

  onMount(() => {
    // A frame first, so the hidden state is painted and the change fades.
    const frame = requestAnimationFrame(() => (hidden = false));
    return () => cancelAnimationFrame(frame);
  });

  // Only keyboard focus holds the bar up. Closing the picker's sheet hands
  // focus back to its pill, and the bar then never made way for the page.
  const keyboard_inside = () => bar?.querySelector(":focus-visible") != null;

  const HIDE_AFTER = 8; // px down before the bar makes way
  const SHOW_AFTER = 24; // px up before it returns
  const TOP = 120; // within this of the top it stays

  $effect(() => {
    // Where the current run of scrolling, down or up, began.
    let anchor = scrollY;
    let last = scrollY;
    const on_scroll = () => {
      // Safari reports positions past either end while the page bounces
      // there; held to the page, the bounce back does not read as scrolling.
      const end = document.documentElement.scrollHeight - innerHeight;
      const y = Math.min(Math.max(scrollY, 0), Math.max(0, end));
      if (y === last) return;
      if (Math.sign(y - last) !== Math.sign(last - anchor)) anchor = last;
      last = y;
      if (y < TOP) hidden = false;
      else if (y - anchor > HIDE_AFTER) hidden = !keyboard_inside();
      else if (anchor - y > SHOW_AFTER) hidden = false;
    };
    addEventListener("scroll", on_scroll, { passive: true });
    return () => removeEventListener("scroll", on_scroll);
  });
</script>

<svelte:head>
  <noscript>
    <style>
      [data-floating-bar] > * {
        visibility: visible !important;
        opacity: 1 !important;
        translate: none !important;
      }
    </style>
  </noscript>
</svelte:head>

<!-- Only the pill takes touches: the rest of the row is see-through, and a
     tap beside the pill belongs to the poster underneath. -->
<!-- Placed from the top by the small viewport, the screen with Safari's
     toolbar out: the bar stays on one spot as the toolbar comes and goes,
     rather than riding up and down with it. -->
<div class="fixed inset-x-0 top-[calc(100svh-4.5rem)] z-40 h-0 sm:hidden">
  <div
    bind:this={bar}
    data-floating-bar
    data-tucked={hidden ? "" : undefined}
    onfocusin={() => {
      if (keyboard_inside()) hidden = false;
    }}
    class="pointer-events-none flex w-full justify-center px-4 pb-3 *:pointer-events-auto">
    <ProgrammeControls {cinemaOptions} presentation="floating" {id} />
  </div>
</div>

<style>
  /* The pill fades itself. Faded as part of this row, it would lose what
     lies behind it (a faded ancestor is a backdrop root) and flicker from
     frosted glass to clear for the whole fade. It belongs to the bottom
     edge, so it tucks down towards it and rises back from it: 16px, which
     keeps it clear of the edge itself (Safari's toolbar, above). Showing and
     hiding answer the scroll, so both are short and move together, and it
     leaves faster than it comes. */
  [data-floating-bar] > :global(*) {
    transition:
      opacity 220ms cubic-bezier(0.23, 1, 0.32, 1),
      translate 220ms cubic-bezier(0.23, 1, 0.32, 1),
      scale 150ms cubic-bezier(0.23, 1, 0.32, 1),
      visibility 220ms;
  }
  [data-floating-bar][data-tucked] > :global(*) {
    opacity: 0;
    translate: 0 16px;
    visibility: hidden;
    transition-duration: 160ms, 160ms, 150ms, 160ms;
  }
  /* Its sheet is glass: the pill underneath would show through it, so it
     makes way while the sheet is up. While the page behind the sheet is
     stepped back (sheet-stage.ts), the pill is fixed to the scaled page
     rather than the screen and would jump, so it goes at once and returns
     only once the page is itself again. */
  [data-floating-bar] > :global([data-state="open"]) {
    opacity: 0;
  }
  :global(html[data-sheet-pushed]) [data-floating-bar] > :global(*) {
    opacity: 0;
    transition: none;
  }
  @media (prefers-reduced-motion: reduce) {
    [data-floating-bar][data-tucked] > :global(*) {
      translate: none;
    }
  }
</style>
