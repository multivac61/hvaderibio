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
  // A new cinema closes the picker, and the posters slide to their places in
  // the new programme rather than the whole grid being swapped in one frame.
  // A day is chosen with the picker still open over the posters, which only
  // cross-fade behind it; it lands at once, its content fading in by itself,
  // since a view transition takes every click until it ends and a second
  // day clicked a moment after the first was lost. What is already chosen
  // changes nothing.
  const select_cinema = (choice: string) => {
    if (choice !== selection.cinema) with_view_transition(() => (selection.cinema = choice));
  };
  const select_day = (day: string) => {
    if (day !== selection.day) selection.day = day;
  };
</script>

<ProgrammePicker
  {cinemaOptions}
  cinema={selection.cinema}
  day={selection.day}
  onCinema={select_cinema}
  onDay={select_day}
  {presentation}
  {id} />
