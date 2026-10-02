<script lang="ts">
  import { get_programme_movies } from "#lib/programme.js";
  import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice, cinemaState } from "#lib/cinema-state.svelte.js";
  import { dayState } from "#lib/day-state.svelte.js";
  import ProgrammeControls from "#lib/ProgrammeControls.svelte";
  import MoviePosterCard from "#lib/MoviePosterCard.svelte";
  import PageMeta from "#lib/PageMeta.svelte";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";

  const { data } = $props();
  const movies = $derived(data.movies);
  const cinema_options = $derived(data.cinema_options);

  // Do not render the time-sensitive grid until the browser knows the current
  // time. This prevents Safari from hydrating stale poster ordering.
  let now = $state<Date | null>(null);

  onMount(() => {
    now = new Date();
  });

  // Read cinema and day from shared state
  const selected_choice = $derived(cinemaState.value ?? DEFAULT_CINEMA_CHOICE);
  const selected_cinemas = $derived(get_cinemas_for_choice(selected_choice, cinema_options));
  const selected_day = $derived(dayState.value ?? "0");

  const filtered_cinemas_showtimes = $derived(now ? get_programme_movies(movies, selected_day, selected_cinemas, now) : []);
</script>

<PageMeta
  title="Hvað er í bíó? - Bíódagskrá kvöldsins"
  description="Fljótlegt yfirlit yfir bíódagskrá kvöldsins á öllu landinu. Skoðaðu sýningartíma og bókaðu miða."
  path="/" />

<header class="relative hidden sm:mt-8 sm:mb-5 sm:block">
  <h1 class="mb-3 text-center text-5xl tracking-tight text-pretty text-white" style="font-family: 'Space Grotesk', sans-serif;">
    Hvað er í bíó?
  </h1>
  <div class="mx-auto sm:block md:max-w-none">
    <ProgrammeControls cinemaOptions={cinema_options} selectedChoice={selected_choice} selectedDay={selected_day} presentation="tabs" />
  </div>
</header>

<div class="relative">
  <div in:fade={{ duration: 220 }} class="sticky top-[calc(100dvh-5.5rem)] z-40 h-0 sm:hidden">
    <div class="flex w-full justify-center px-4 pb-3">
      <ProgrammeControls
        cinemaOptions={cinema_options}
        selectedChoice={selected_choice}
        selectedDay={selected_day}
        presentation="floating" />
    </div>
  </div>

  {#if now}
    {#key `${selected_day}-${selected_choice}`}
      {#if filtered_cinemas_showtimes.length === 0}
        <div in:fade={{ duration: 180 }} class="flex flex-col items-center justify-center py-16 text-center">
          <p class="text-lg text-neutral-400">Engar sýningar fundust</p>
          <p class="mt-1 text-sm text-neutral-500">Prófaðu að velja annan dag eða kvikmyndahús</p>
        </div>
      {:else}
        <div
          class="-mx-1 grid grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] gap-4 sm:mx-0 sm:mb-8 sm:grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),2fr))] sm:gap-6 sm:pt-2">
          {#each filtered_cinemas_showtimes as movie, index (movie.id)}
            <MoviePosterCard {movie} {index} />
          {/each}
        </div>
      {/if}
    {/key}
  {/if}
</div>
