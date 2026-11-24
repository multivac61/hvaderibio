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
  // A cinema clicked closes the picker, and the posters slide to their
  // places in the new programme rather than the whole grid being swapped in
  // one frame. Anything chosen with the picker still open (a day, a cinema
  // by the arrow keys) lands at once, its content fading in by itself: a
  // view transition takes every input until it ends, so a second day
  // clicked a moment after the first was lost, and a keyboard action gets
  // no animation. What is already chosen changes nothing.
  const select_cinema = (choice: string, slide: boolean) => {
    if (choice === selection.cinema) return;
    if (slide) with_view_transition(() => (selection.cinema = choice));
    else selection.cinema = choice;
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
