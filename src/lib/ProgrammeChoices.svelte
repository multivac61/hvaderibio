<script lang="ts">
  // What the programme picker opens to: the days as a segmented row, then the
  // cinemas as a list. A day keeps the panel open, since a cinema often comes
  // next; a cinema clicked finishes the choice. The arrow keys only move it,
  // so a keyboard can walk the list with the panel still open.
  import type { CinemaOption } from "#lib/cinemas.js";
  import { AVAILABLE_DAYS, get_day_label } from "#lib/day-picker.js";
  import Segmented from "#lib/Segmented.svelte";
  import { on_radio_keydown } from "#lib/radio-group.js";

  type Props = {
    cinemaOptions: readonly CinemaOption[];
    cinema: string;
    day: string;
    onDay: (day: string) => void;
    onCinema: (cinema: string, finish: boolean) => void;
  };

  const { cinemaOptions, cinema, day, onDay, onCinema }: Props = $props();
  const day_items = AVAILABLE_DAYS.map((value) => ({ value, label: get_day_label(value) }));
  const cinema_labels = $derived(cinemaOptions.map(([label]) => label));
</script>

<p class="text-pick-ink/60 mb-2 text-xs font-medium">Dagur</p>
<Segmented items={day_items} selected={day} onSelect={onDay} label="Veldu dag" />
<p class="text-pick-ink/60 mt-5 mb-1.5 text-xs font-medium pointer-fine:mt-4">Kvikmyndahús</p>
<div role="radiogroup" aria-label="Veldu kvikmyndahús" class="-mx-1.5">
  {#each cinemaOptions as [label] (label)}
    <button
      type="button"
      role="radio"
      aria-checked={label === cinema}
      tabindex={label === cinema ? 0 : -1}
      onkeydown={(event) => on_radio_keydown(event, cinema_labels, (choice) => onCinema(choice, false))}
      onclick={() => onCinema(label, true)}
      class="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[15px] select-none [transition:background-color_150ms_ease,color_150ms_ease,transform_150ms_cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] motion-reduce:active:scale-100 pointer-fine:min-h-9 pointer-fine:rounded-lg pointer-fine:text-sm {label ===
      cinema
        ? 'bg-pick-ink/[0.06] text-pick-ink font-medium'
        : 'text-pick-ink/70 hover:bg-pick-ink/[0.04] hover:text-pick-ink'}">
      <span class="min-w-0">{label}</span>
      {#if label === cinema}
        <svg
          class="text-pick-highlight size-4 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true">
          <path d="M3 8.5 6.5 12 13 4.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {/if}
    </button>
  {/each}
</div>
