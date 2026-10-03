<script lang="ts">
  import type { CinemaOption } from "#lib/cinemas.js";
  import ProgrammeControls from "#lib/ProgrammeControls.svelte";
  import { fade } from "svelte/transition";

  type Props = {
    cinemaOptions: readonly CinemaOption[];
    id?: string;
  };

  const { cinemaOptions, id }: Props = $props();

  // The phone control bar floats over the content; slide it away while the
  // visitor scrolls down to read, and bring it back when they scroll up,
  // reach the top or bottom, or move keyboard focus into it.
  let hidden = $state(false);
  let bar: HTMLElement | undefined = $state();

  $effect(() => {
    let last = scrollY;
    const on_scroll = () => {
      const y = scrollY;
      if (Math.abs(y - last) < 8) return;
      const near_edge = y < 120 || y + innerHeight >= document.documentElement.scrollHeight - 40;
      hidden = y > last && !near_edge && !bar?.contains(document.activeElement);
      last = y;
    };
    addEventListener("scroll", on_scroll, { passive: true });
    return () => removeEventListener("scroll", on_scroll);
  });
</script>

<div in:fade={{ duration: 220 }} class="sticky top-[calc(100dvh-5.5rem)] z-40 h-0 sm:hidden">
  <div
    bind:this={bar}
    onfocusin={() => (hidden = false)}
    class="flex w-full justify-center px-4 pb-3 transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none {hidden
      ? 'pointer-events-none translate-y-24 opacity-0'
      : ''}">
    <ProgrammeControls {cinemaOptions} presentation="floating" {id} />
  </div>
</div>
