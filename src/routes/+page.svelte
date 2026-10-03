<script lang="ts">
  import { get_programme_movies } from "#lib/programme.js";
  import { get_cinemas_for_choice, selection } from "#lib/selection.svelte.js";
  import ProgrammeControls from "#lib/ProgrammeControls.svelte";
  import FloatingControls from "#lib/FloatingControls.svelte";
  import MoviePosterCard from "#lib/MoviePosterCard.svelte";
  import PageMeta from "#lib/PageMeta.svelte";
  import { count_label } from "#lib/accessible-labels.js";
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

  const selected_cinemas = $derived(get_cinemas_for_choice(selection.cinema, cinema_options));

  const filtered_cinemas_showtimes = $derived(now ? get_programme_movies(movies, selection.day, selected_cinemas, now) : []);
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

<header class="relative sm:mt-8 sm:mb-5">
  <!-- Phones hide the header visually but keep the page heading for screen readers. -->
  <h1
    class="mb-3 text-center text-5xl tracking-tight text-pretty text-white max-sm:sr-only"
    style="font-family: 'Space Grotesk', sans-serif;">
    Hvað er í bíó?
  </h1>
  <div class="mx-auto hidden sm:block md:max-w-none">
    <ProgrammeControls cinemaOptions={cinema_options} presentation="tabs" />
  </div>
</header>

<div class="relative">
  <FloatingControls cinemaOptions={cinema_options} />

  <!-- Announces the result of changing the day or cinema to screen readers. -->
  <p role="status" class="sr-only">
    {#if now}{filtered_cinemas_showtimes.length > 0
        ? count_label(filtered_cinemas_showtimes.length, "mynd", "myndir")
        : "Engar sýningar fundust"}{/if}
  </p>

  {#if now}
    {#key `${selection.day}-${selection.cinema}`}
      {#if filtered_cinemas_showtimes.length === 0}
        <div in:fade={{ duration: 180 }} class="flex flex-col items-center justify-center py-16 text-center">
          <p class="text-lg text-neutral-400">Engar sýningar fundust</p>
          <p class="mt-1 text-sm text-neutral-400">Prófaðu að velja annan dag eða kvikmyndahús</p>
        </div>
      {:else}
        <div
          bind:this={grid}
          tabindex="-1"
          class="-mx-1 grid grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] gap-4 focus:outline-none sm:mx-0 sm:mb-8 sm:grid-cols-[repeat(auto-fill,minmax(min(13rem,100%),2fr))] sm:gap-6 sm:pt-2 lg:grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),2fr))] xl:grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),2fr))]">
          {#each filtered_cinemas_showtimes as movie, index (movie.id)}
            <MoviePosterCard {movie} {index} />
          {/each}
        </div>
      {/if}
    {/key}
  {/if}
</div>
