<script lang="ts">
  import type { CinemaOption } from "$lib/cinemas";
  import { cinemaState } from "$lib/cinema-state.svelte";
  import { dayState } from "$lib/day-state.svelte";
  import CinemaSelect from "$lib/CinemaSelect.svelte";
  import CinemaTabs from "$lib/CinemaTabs.svelte";
  import DayPicker from "$lib/DayPicker.svelte";

  type Props = {
    cinemaOptions: readonly CinemaOption[];
    selectedChoice: string;
    selectedDay: string;
    presentation: "tabs" | "floating" | "inline";
    id?: string;
  };

  const { cinemaOptions, selectedChoice, selectedDay, presentation, id }: Props = $props();
</script>

{#if presentation === "tabs"}
  <CinemaTabs {cinemaOptions} {selectedChoice} onSelect={(choice) => cinemaState.set(choice)} />
  <div class="flex justify-center">
    <DayPicker {selectedDay} onSelect={(day) => dayState.set(day)} />
  </div>
{:else if presentation === "floating"}
  <div class="flex flex-col items-center gap-2">
    <div class="flex justify-center">
      <CinemaSelect {cinemaOptions} {selectedChoice} onSelect={(choice) => cinemaState.set(choice)} {id} />
    </div>
    <div class="flex justify-center">
      <DayPicker {selectedDay} onSelect={(day) => dayState.set(day)} size="sm" />
    </div>
  </div>
{:else}
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
    <DayPicker {selectedDay} onSelect={(day) => dayState.set(day)} shrink />
    <CinemaSelect {cinemaOptions} {selectedChoice} onSelect={(choice) => cinemaState.set(choice)} {id} size="sm" />
  </div>
{/if}
