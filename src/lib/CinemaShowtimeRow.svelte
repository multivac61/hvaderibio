<script lang="ts">
  import { CINEMA_DISPLAY_NAMES, CINEMA_URLS } from "$lib/constants";
  import type { Showtime } from "$lib/schemas";
  import ShowtimeBadges from "$lib/ShowtimeBadges.svelte";

  type Props = {
    cinema: string;
    showtimes: readonly Showtime[];
  };

  const { cinema, showtimes }: Props = $props();
  const cinemaUrl = $derived(CINEMA_URLS[cinema]);
  const cinemaName = $derived(CINEMA_DISPLAY_NAMES[cinema] ?? cinema);
</script>

<div
  class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_20px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-colors duration-200 hover:border-white/10 hover:bg-white/[0.045] md:p-4">
  <div class="mb-2 min-w-0 md:mb-3">
    {#if cinemaUrl}
      <a
        href={cinemaUrl}
        target="_blank"
        rel="external noopener noreferrer"
        class="text-sm font-semibold text-neutral-200 transition-colors hover:text-white md:text-base">
        {cinemaName}
      </a>
    {:else}
      <span class="text-sm font-semibold text-neutral-200 md:text-base">{cinemaName}</span>
    {/if}
  </div>

  <div class="flex flex-wrap gap-2">
    {#each showtimes as showtime, i (`${showtime.time}-${i}`)}
      <a
        href={showtime.purchase_url}
        target="_blank"
        rel="external noopener noreferrer"
        class="group/time relative inline-flex items-center rounded bg-neutral-800 px-2 py-1.5 text-sm text-neutral-400 tabular-nums transition-[background-color,color,transform] duration-150 ease-out hover:bg-neutral-700 hover:text-white active:scale-95">
        <ShowtimeBadges {showtime} />
        <span>{new Date(showtime.time).toLocaleTimeString("is-IS", { timeStyle: "short", hour12: false })}</span>
        <span
          class="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 rounded bg-neutral-950/95 px-2 py-1 text-[10px] font-medium whitespace-nowrap text-neutral-300 opacity-0 shadow-lg transition-opacity group-hover/time:opacity-100 [@media(hover:hover)]:block">
          Kaupa miða
        </span>
      </a>
    {/each}
  </div>
</div>
