<script lang="ts">
  import type { Showtime } from "#lib/schemas.js";

  type Props = {
    showtime: Showtime;
  };

  const { showtime }: Props = $props();

  const hasBadges = $derived(
    showtime.is_icelandic ||
      showtime.is_3d ||
      showtime.is_luxus ||
      showtime.is_vip ||
      showtime.is_atmos ||
      showtime.is_max ||
      showtime.is_flauel
  );
</script>

{#if hasBadges}
  <span class="absolute -top-1.5 -right-1.5 flex gap-0.5">
    {#if showtime.is_icelandic}
      <svg class="h-2.5 w-3" viewBox="0 0 25 18" fill="none">
        <rect width="25" height="18" fill="#003897" />
        <rect x="7" width="4" height="18" fill="#fff" />
        <rect y="7" width="25" height="4" fill="#fff" />
        <rect x="8" width="2" height="18" fill="#D72828" />
        <rect y="8" width="25" height="2" fill="#D72828" />
      </svg>
    {/if}
    {#if showtime.is_3d}
      <span class="rounded bg-blue-600 px-0.5 text-[8px] font-bold text-white">3D</span>
    {/if}
    {#if showtime.is_luxus}
      <span class="rounded bg-yellow-500 px-0.5 text-[8px] font-bold text-black">LÚX</span>
    {/if}
    {#if showtime.is_vip}
      <span class="rounded bg-emerald-600 px-0.5 text-[8px] font-bold text-white">VIP</span>
    {/if}
    {#if showtime.is_atmos}
      <span class="rounded bg-purple-600 px-0.5 text-[8px] font-bold text-white">ÁSBERG</span>
    {/if}
    {#if showtime.is_max}
      <span class="rounded bg-red-600 px-0.5 text-[8px] font-bold text-white">MAX</span>
    {/if}
    {#if showtime.is_flauel}
      <span class="rounded bg-pink-500 px-0.5 text-[8px] font-bold text-white">FLAUEL</span>
    {/if}
  </span>
{/if}
