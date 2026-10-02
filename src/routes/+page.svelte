<script lang="ts">
  import { get_programme_movies } from "#lib/programme.js";
  import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice, cinemaState } from "#lib/cinema-state.svelte.js";
  import { dayState } from "#lib/day-state.svelte.js";
  import ProgrammeControls from "#lib/ProgrammeControls.svelte";
  import MoviePosterCard from "#lib/MoviePosterCard.svelte";
  import PageMeta from "#lib/PageMeta.svelte";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";

  const { data } = $props();
  const movies = $derived(data.movies);
  const cinema_options = $derived(data.cinema_options);

  // Do not render the time-sensitive grid until the browser knows the current
  // time. This prevents Safari from hydrating stale poster ordering.
  let now = $state<Date | null>(null);

  onMount(() => {
    now = new Date();
  });

  // Keyboard focus starts at the poster grid, so the first Tab lands on the
  // first poster rather than the header controls (Shift+Tab reaches those).
  // Coming back through history returns focus to the poster the visitor
  // opened. Scroll position is restored by SvelteKit either way.
  let grid: HTMLElement | undefined = $state();
  let focus_request: { poster: string | null } | null = $state(null);

  // History navigations restore the snapshot after afterNavigate has run.
  export const snapshot = {
    capture: () => (document.activeElement instanceof HTMLElement ? (document.activeElement.dataset.movieId ?? null) : null),
    restore: (movie_id: string | null) => {
      focus_request = { poster: movie_id };
    },
  };

  afterNavigate(({ type }) => {
    if (type !== "popstate") focus_request = { poster: null };
  });

  $effect(() => {
    // The grid renders after mount, so wait for it before focusing.
    if (!focus_request || !grid) return;
    const { poster } = focus_request;
    const target = poster ? grid.querySelector<HTMLElement>(`a[data-movie-id="${CSS.escape(poster)}"]`) : null;
    (target ?? grid).focus({ preventScroll: true });
    focus_request = null;
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

<svelte:head>
  <!-- Space Grotesk only sets the desktop heading, so load it here rather than
       on every page, subset to the heading's glyphs. -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500&text=Hva%C3%B0%20er%20%C3%AD%20b%C3%AD%C3%B3%3F&display=swap"
    rel="stylesheet" />
</svelte:head>

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
          bind:this={grid}
          tabindex="-1"
          class="-mx-1 grid grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] gap-4 focus:outline-none sm:mx-0 sm:mb-8 sm:grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),2fr))] sm:gap-6 sm:pt-2">
          {#each filtered_cinemas_showtimes as movie, index (movie.id)}
            <MoviePosterCard {movie} {index} />
          {/each}
        </div>
      {/if}
    {/key}
  {/if}
</div>
