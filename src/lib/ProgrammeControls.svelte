<script lang="ts">
  import type { CinemaOption } from "#lib/cinemas.js";
  import { selection } from "#lib/selection.svelte.js";
  import CinemaSelect from "#lib/CinemaSelect.svelte";
  import CinemaTabs from "#lib/CinemaTabs.svelte";
  import DayPicker from "#lib/DayPicker.svelte";

  type Props = {
    cinemaOptions: readonly CinemaOption[];
    presentation: "tabs" | "floating" | "inline";
    id?: string;
  };

  const { cinemaOptions, presentation, id }: Props = $props();
  const select_cinema = (choice: string) => (selection.cinema = choice);
  const select_day = (day: string) => (selection.day = day);
</script>

{#if presentation === "tabs"}
  <CinemaTabs {cinemaOptions} selectedChoice={selection.cinema} onSelect={select_cinema} />
  <div class="flex justify-center">
    <DayPicker selectedDay={selection.day} onSelect={select_day} />
  </div>
{:else if presentation === "floating"}
  <div class="flex flex-col items-center gap-2">
    <div class="flex justify-center">
      <CinemaSelect {cinemaOptions} selectedChoice={selection.cinema} onSelect={select_cinema} {id} />
    </div>
    <div class="flex justify-center">
      <DayPicker selectedDay={selection.day} onSelect={select_day} size="sm" />
    </div>
  </div>
{:else}
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
    <DayPicker selectedDay={selection.day} onSelect={select_day} shrink />
    <CinemaSelect {cinemaOptions} selectedChoice={selection.cinema} onSelect={select_cinema} {id} size="sm" />
  </div>
{/if}
