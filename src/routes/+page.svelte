<script lang="ts" module>
  // Only the first page load shows the prerendered grid; coming back to the
  // page later renders in the browser, which already knows the time.
  let hydrated = false;
</script>

<script lang="ts">
  import { get_programme_movies, keep_order } from "#lib/programme.js";
  import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice, selection } from "#lib/selection.svelte.js";
  import ProgrammeControls from "#lib/ProgrammeControls.svelte";
  import FloatingControls from "#lib/FloatingControls.svelte";
  import MoviePosterCard from "#lib/MoviePosterCard.svelte";
  import { poster_tilt } from "#lib/PosterTilt.svelte";
  import PageMeta from "#lib/PageMeta.svelte";
  import { count_label } from "#lib/accessible-labels.js";
  import { scale } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";
  import { can_view_transition } from "#lib/view-transition.js";
  import { after_stage } from "#lib/sheet-stage.js";
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";

  const { data } = $props();
  const movies = $derived(data.movies);
  const cinema_options = $derived(data.cinema_options);

  // The page is prerendered with the grid as of the hourly build, and hydrates
  // with exactly that. Once mounted the browser's clock takes over, but the
  // posters keep the build's order: films that have ended since only drop
  // out, so none of the others is seen jumping.
  const hydrating = !hydrated;
  let now = $state<Date | null>(hydrating ? null : new Date());

  onMount(() => {
    hydrated = true;
    if (hydrating) now = new Date();
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
    // The grid is missing while nothing is showing, so wait for it.
    if (!focus_request || !grid) return;
    const { poster } = focus_request;
    const target = poster ? grid.querySelector<HTMLElement>(`a[data-movie-id="${CSS.escape(poster)}"]`) : null;
    (target ?? grid).focus({ preventScroll: true });
    focus_request = null;
  });

  const selected_cinemas = $derived(get_cinemas_for_choice(selection.cinema, cinema_options));

  const prerendered = $derived(data.prerendered.flatMap((id) => movies.find((movie) => movie.id === id) ?? []));
  // The selection the page was prerendered for.
  const is_prerendered_choice = $derived(selection.day === "0" && selection.cinema === DEFAULT_CINEMA_CHOICE);

  const programme_at = (at: Date) => {
    const fresh = get_programme_movies(movies, selection.day, selected_cinemas, at);
    return is_prerendered_choice ? keep_order(data.prerendered, fresh) : fresh;
  };

  const filtered_cinemas_showtimes = $derived(now ? programme_at(now) : prerendered);

  // A new cinema is a new list: back to its top, rather than wherever the
  // shorter list happens to end. On a phone, once the sheet it was chosen
  // in has gone and the page is itself again.
  let shown_cinema = selection.cinema;
  $effect(() => {
    if (selection.cinema === shown_cinema) return;
    shown_cinema = selection.cinema;
    after_stage(scroll_to_top);
  });

  // After the sheet, bits-ui hands the page its scrolling back a moment
  // later, and that hand-over stops a smooth scroll already under way.
  const scroll_to_top = (frames = 60) => {
    if (document.body.style.overflow === "hidden" && frames > 0) {
      requestAnimationFrame(() => scroll_to_top(frames - 1));
      return;
    }
    scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  // Whether the grid animates its own changes: where the page's view
  // transition does not (phones), and the visitor has not asked for less
  // motion. Read once the app runs; the prerendered grid does not move.
  let grid_motion = $state(false);
  onMount(() => {
    grid_motion = !can_view_transition() && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
</script>

<PageMeta
  title="Hvað er í bíó? - Bíódagskrá kvöldsins"
  description="Fljótlegt yfirlit yfir bíódagskrá kvöldsins á öllu landinu. Skoðaðu sýningartíma og bókaðu miða."
  path="/" />

<svelte:head>
  <!-- Space Grotesk only sets the desktop heading, subset to its glyphs and
       served from this site: Google's stylesheet blocked the first paint on
       a separate connection. Preloaded where the heading shows. -->
  <link
    rel="preload"
    as="font"
    type="font/woff2"
    href="/fonts/space-grotesk-500-heading.woff2"
    crossorigin="anonymous"
    media="(min-width: 640px)" />
</svelte:head>

<header class="relative sm:mt-10 sm:mb-10">
  <!-- Phones hide the header visually but keep the page heading for screen readers. -->
  <h1
    class="mb-6 text-center text-5xl tracking-tight text-pretty text-white max-sm:sr-only"
    style="font-family: 'Space Grotesk', sans-serif;">
    <!-- The title leads to the page about the site. -->
    <a href={resolve("/um")} class="rounded-lg transition-opacity hover:opacity-80">Hvað er í bíó?</a>
  </h1>
  <div class="mx-auto hidden sm:block md:max-w-none">
    <ProgrammeControls cinemaOptions={cinema_options} presentation="header" id="select-cinemas-desktop" />
  </div>
</header>

<!-- On phones the floating bar returns at the end of the page; the room
     below the last row lets those posters scroll clear of it. -->
<div class="relative max-sm:pb-16">
  <FloatingControls cinemaOptions={cinema_options} />

  <!-- Announces the result of changing the day or cinema to screen readers. -->
  <p role="status" class="sr-only">
    {#if now}{filtered_cinemas_showtimes.length > 0
        ? count_label(filtered_cinemas_showtimes.length, "mynd", "myndir")
        : "Engar sýningar fundust"}{/if}
  </p>

  {#if filtered_cinemas_showtimes.length === 0}
    <div class="fade-in flex flex-col items-center justify-center py-16 text-center">
      <p class="text-lg text-neutral-400">Engar sýningar fundust</p>
      <p class="mt-1 text-sm text-neutral-400">Prófaðu að velja annan dag eða kvikmyndahús</p>
    </div>
  {:else}
    <!-- 8.5rem keeps two posters to a row down to a 320px screen, and a
           third from squeezing in on the widest phones (440px). -->
    <div
      bind:this={grid}
      {@attach poster_tilt}
      tabindex="-1"
      class="-mx-1 grid grid-cols-[repeat(auto-fill,minmax(min(8.5rem,100%),2fr))] gap-4 focus:outline-none sm:mx-0 sm:mb-8 sm:grid-cols-[repeat(auto-fill,minmax(min(13rem,100%),2fr))] sm:gap-6 sm:pt-2 lg:grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),2fr))] xl:grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),2fr))]">
      <!-- On a phone a new choice moves the grid: posters in both selections
           glide to their new places, new ones fade in. Wide screens slide
           them with the page's view transition instead, and visitors who
           ask for less motion get the new grid at once. -->
      {#each filtered_cinemas_showtimes as movie, index (movie.id)}
        <div
          animate:flip={{ duration: grid_motion ? 300 : 0, easing: quintOut }}
          in:scale={{ duration: grid_motion ? 250 : 0, start: 0.96, easing: quintOut }}>
          <MoviePosterCard {movie} {index} />
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Phones hide the title, which is the way to the page about the site
     elsewhere, so on phones the way there is here instead. -->
<footer class="mt-10 mb-24 text-center text-sm sm:hidden">
  <a href={resolve("/um")} class="text-neutral-500 transition-colors hover:text-white">Um síðuna</a>
</footer>

<style>
  /* Subset by Google Fonts to "Hvað er í bíó?"; see static/fonts/OFL.txt. */
  @font-face {
    font-family: "Space Grotesk";
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url("/fonts/space-grotesk-500-heading.woff2") format("woff2");
    unicode-range: U+20, U+3f, U+48, U+61-62, U+65, U+69, U+6f, U+72, U+76, U+e1, U+e9, U+ed, U+f0, U+f3, U+155, U+301;
  }
</style>
