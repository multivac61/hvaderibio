<script lang="ts">
  import type { CinemaOption } from "#lib/cinemas.js";
  import { selection } from "#lib/selection.svelte.js";
  import ProgrammePicker from "#lib/ProgrammePicker.svelte";
  import { with_view_transition } from "#lib/view-transition.js";

  type Props = {
    cinemaOptions: readonly CinemaOption[];
    presentation: "header" | "floating" | "inline";
    id: string;
  };

  const { cinemaOptions, presentation, id }: Props = $props();
  // The posters slide to their places in the new programme, rather than the
  // whole grid being swapped in one frame.
  const select_cinema = (choice: string) => with_view_transition(() => (selection.cinema = choice));
  const select_day = (day: string) => with_view_transition(() => (selection.day = day));
</script>

<ProgrammePicker
  {cinemaOptions}
  cinema={selection.cinema}
  day={selection.day}
  onCinema={select_cinema}
  onDay={select_day}
  {presentation}
  {id} />
