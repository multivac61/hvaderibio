<script lang="ts">
  import { get_movie_programme } from "#lib/programme.js";
  import { get_youtube_id, is_mobile_user_agent } from "#lib/video.js";
  import { get_cinemas_for_choice, selection } from "#lib/selection.svelte.js";
  import ProgrammeControls from "#lib/ProgrammeControls.svelte";
  import FloatingControls from "#lib/FloatingControls.svelte";
  import MovieRatings from "#lib/MovieRatings.svelte";
  import CinemaShowtimeRow from "#lib/CinemaShowtimeRow.svelte";
  import PageMeta from "#lib/PageMeta.svelte";
  import { afterNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { is_keyboard_navigation } from "#lib/input-modality.js";
  import { open_on_space } from "#lib/open-on-space.js";
  import { count_label } from "#lib/accessible-labels.js";
  import { fade } from "svelte/transition";

  const { data } = $props();
  const movie = $derived(data.movie);
  const cinema_options = $derived(data.cinema_options);

  // Extract YouTube video ID from trailer URL
  const youtube_id = $derived(get_youtube_id(movie.trailer_url));

  const now = new Date();

  const selected_cinemas = $derived(get_cinemas_for_choice(selection.cinema, cinema_options));

  let trailer_modal_open = $state(false);
  const openTrailer = () => {
    // On mobile, open YouTube directly (autoplay doesn't work in iframe)
    if (is_mobile_user_agent() && youtube_id) {
      window.open(`https://www.youtube.com/watch?v=${youtube_id}`, "_blank");
    } else {
      trailer_modal_open = true;
    }
  };

  const closeTrailerModal = () => {
    trailer_modal_open = false;
  };

  let trailer_dialog: HTMLDialogElement | undefined = $state();

  // Open the dialog modally and lock page scroll while the trailer plays,
  // releasing both even when the visitor navigates away with it open.
  $effect(() => {
    if (!trailer_modal_open || !trailer_dialog) return;
    const dialog = trailer_dialog;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = "";
    };
  });

  // Visitors arriving from a search engine or shared link have no in-site
  // page to go back to; send them to the programme instead of off the site.
  let came_from_site = $state(false);
  let back_link: HTMLAnchorElement | undefined = $state();
  afterNavigate(({ from }) => {
    came_from_site = from !== null;
    // SvelteKit moves focus to <body> after navigating. Keyboard visitors
    // land on "Til baka" instead, so Enter returns them to their poster.
    if (came_from_site && is_keyboard_navigation()) back_link?.focus();
  });

  const goBack = (event: MouseEvent) => {
    if (!came_from_site) return;
    event.preventDefault();
    history.back();
  };

  const visible_showtimes = $derived(get_movie_programme(movie, selection.day, selected_cinemas, now));
</script>

<PageMeta
  title="{movie.title} - Hvað er í bíó?"
  description={movie.description.length > 160 ? `${movie.description.slice(0, 157).trimEnd()}…` : movie.description}
  path="/movie/{data.path}"
  image="/{movie.id}.webp" />

<svelte:head>
  {#if youtube_id}
    <link rel="preconnect" href="https://img.youtube.com" />
  {/if}
</svelte:head>

<div class="relative">
  <FloatingControls cinemaOptions={cinema_options} id="select-cinemas-movie-mobile" />

  <div class="container mx-auto max-w-7xl py-4 pb-28 md:px-8 md:py-8 lg:px-12 lg:py-10">
    <a
      bind:this={back_link}
      href={resolve("/")}
      onclick={goBack}
      onkeydown={open_on_space}
      class="-mx-2 mb-3 inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors hover:text-white md:mb-5">
      <svg aria-hidden="true" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Til baka
    </a>
    <div class="grid gap-6 md:grid-cols-[320px_1fr] md:gap-8 lg:grid-cols-[400px_1fr] lg:gap-10 xl:grid-cols-[480px_1fr] xl:gap-12">
      <!-- Poster (desktop) / Trailer (mobile if available) -->
      <div class="w-full md:mx-0">
        <!-- Mobile: Show trailer thumbnail if available, otherwise poster -->
        {#if youtube_id}
          <div
            in:fade={{ duration: 260 }}
            class="aspect-video overflow-hidden rounded-md bg-neutral-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-white/90 md:hidden">
            <button type="button" onclick={openTrailer} aria-label="Spila stiklu" class="group relative h-full w-full cursor-pointer">
              <img
                src="https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg"
                alt=""
                width="1280"
                height="720"
                fetchpriority="high"
                loading="eager"
                decoding="async"
                class="h-full w-full object-cover" />
              <div class="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 transition-transform group-hover:scale-110">
                  <svg aria-hidden="true" class="ml-0.5 h-6 w-6 text-neutral-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        {/if}
        <!-- Poster: always on desktop, on mobile only when there is no trailer.
             The blank source keeps hidden phones from downloading it. -->
        <picture in:fade={{ duration: 260 }} class={youtube_id ? "hidden md:block" : "block"}>
          {#if youtube_id}
            <source media="(max-width: 767px)" srcset="data:image/gif;base64,R0lGODlhAQABAIAAAAAAACH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
          {/if}
          <source
            type="image/webp"
            srcset={`/${movie.id}-360w.webp 360w, /${movie.id}.webp 720w, /${movie.id}-1080w.webp 1080w`}
            sizes="(min-width: 1280px) 480px, (min-width: 1024px) 400px, (min-width: 768px) 320px, 100vw" />
          <img
            src={`/${movie.id}.webp`}
            alt=""
            width="720"
            height="1080"
            fetchpriority="high"
            loading="eager"
            decoding="async"
            style:view-transition-name="poster-{movie.id}"
            class="w-full rounded-md shadow-2xl" />
        </picture>
      </div>

      <!-- Content -->
      <div class="space-y-4">
        <div>
          <h1 class="text-2xl font-bold text-balance text-white md:text-3xl">{movie.title}</h1>

          <!-- Meta info: year, duration, genres + ratings on desktop -->
          <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-400">
            <span>{movie.release_year}</span>
            <span>·</span>
            <span>{movie.duration_in_mins} mín</span>
            {#if movie.genres.length > 0}
              <span>·</span>
              <span>{movie.genres.slice(0, 2).join(", ")}</span>
            {/if}
            <!-- eslint-disable svelte/no-navigation-without-resolve -->
            <MovieRatings {movie} desktop />
          </div>

          <!-- Ratings row - mobile only -->
          {#if movie.imdb?.star || movie.rotten_tomatoes || movie.metacritic || movie.letterboxd?.score}
            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-400 md:hidden">
              <MovieRatings {movie} />
            </div>
          {/if}
        </div>

        <p class="text-sm leading-relaxed text-neutral-400 md:text-base">{movie.description}</p>

        <!-- Trailer (desktop only - mobile shows in hero position) -->
        {#if youtube_id}
          <div
            in:fade={{ duration: 260 }}
            class="hidden aspect-video overflow-hidden rounded-md bg-neutral-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-white/90 md:block">
            <button type="button" onclick={openTrailer} aria-label="Spila stiklu" class="group relative h-full w-full cursor-pointer">
              <img
                src="https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg"
                alt=""
                width="1280"
                height="720"
                loading="lazy"
                decoding="async"
                class="h-full w-full object-cover" />
              <div class="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 transition-transform group-hover:scale-110">
                  <svg aria-hidden="true" class="ml-0.5 h-5 w-5 text-neutral-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        {/if}

        <!-- Showtimes -->
        <div class="pt-2 md:max-w-3xl">
          <div class="mb-5 hidden sm:block">
            <ProgrammeControls cinemaOptions={cinema_options} presentation="inline" id="select-cinemas-movie-desktop" />
          </div>

          <!-- eslint-disable svelte/no-navigation-without-resolve -->
          <!-- Announces the result of changing the day or cinema to screen readers. -->
          <p role="status" class="sr-only">
            {visible_showtimes.length > 0
              ? count_label(
                  visible_showtimes.reduce((n, row) => n + row.showtimes.length, 0),
                  "sýning",
                  "sýningar"
                )
              : "Engar sýningar fundust"}
          </p>
          {#key `${selection.day}-${selection.cinema}`}
            {#if visible_showtimes.length > 0}
              <div in:fade={{ duration: 160 }} class="space-y-3">
                {#each visible_showtimes as { cinema, showtimes } (cinema)}
                  <CinemaShowtimeRow {cinema} {showtimes} />
                {/each}
              </div>
            {:else}
              <div in:fade={{ duration: 180 }} class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-neutral-400">
                Engar sýningar fundust fyrir þetta val.
              </div>
            {/if}
          {/key}
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Trailer: a native modal dialog moves focus in, makes the page behind
     inert, closes on Escape and returns focus to the trailer button. -->
<dialog
  bind:this={trailer_dialog}
  onclose={closeTrailerModal}
  aria-label="Stikla: {movie.title}"
  class="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none items-center justify-center bg-black/95 p-4 backdrop:bg-black/80 open:flex">
  {#if trailer_modal_open && youtube_id}
    <button
      type="button"
      onclick={closeTrailerModal}
      aria-label="Loka"
      class="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
      <svg aria-hidden="true" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <!-- Backdrop click target; Escape and the close button cover keyboard users. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="absolute inset-0" onclick={closeTrailerModal}></div>
    <div class="relative aspect-video w-full max-w-5xl">
      <iframe
        src="https://www.youtube.com/embed/{youtube_id}?autoplay=1&rel=0&modestbranding=1"
        title="Stikla: {movie.title}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        class="h-full w-full rounded-lg"></iframe>
    </div>
  {/if}
</dialog>
