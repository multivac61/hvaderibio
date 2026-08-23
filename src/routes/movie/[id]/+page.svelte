<script lang="ts">
  import { get_showtime_window, get_valid_showtimes } from "$lib/showtimes";
  import { get_youtube_id, is_mobile_user_agent } from "$lib/video";
  import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice, cinemaState } from "$lib/cinema-state.svelte";
  import { dayState } from "$lib/day-state.svelte";
  import CinemaSelect from "$lib/CinemaSelect.svelte";
  import DayPicker from "$lib/DayPicker.svelte";
  import MovieRatings from "$lib/MovieRatings.svelte";
  import CinemaShowtimeRow from "$lib/CinemaShowtimeRow.svelte";
  import { fade } from "svelte/transition";

  const { data } = $props();
  const movie = $derived(data.movie);
  const cinema_options = $derived(data.cinema_options);

  // Extract YouTube video ID from trailer URL
  const youtube_id = $derived(get_youtube_id(movie.trailer_url));

  const { from, to } = get_showtime_window();

  // Read cinema from shared state
  const selected_choice = $derived(cinemaState.value ?? DEFAULT_CINEMA_CHOICE);
  const selected_cinemas = $derived(get_cinemas_for_choice(selected_choice, cinema_options));

  // Day selection from shared state
  const selected_day = $derived(dayState.value ?? "0");
  let trailer_modal_open = $state(false);
  const openTrailer = () => {
    // On mobile, open YouTube directly (autoplay doesn't work in iframe)
    if (is_mobile_user_agent() && youtube_id) {
      window.open(`https://www.youtube.com/watch?v=${youtube_id}`, "_blank");
    } else {
      trailer_modal_open = true;
      document.body.style.overflow = "hidden";
    }
  };

  const closeTrailerModal = () => {
    trailer_modal_open = false;
    document.body.style.overflow = "";
  };

  const updateDay = (day: string) => {
    dayState.set(day);
  };

  const updateCinema = (choice: string) => {
    cinemaState.set(choice);
  };

  const visible_showtimes = $derived.by(() =>
    Object.entries(movie.showtimes_by_day[selected_day] ?? {})
      .filter(([cinema]) => selected_cinemas.includes(cinema))
      .map(([cinema, times]) => ({ cinema, showtimes: get_valid_showtimes(times, selected_day, from, to) }))
      .filter(({ showtimes }) => showtimes.length > 0)
  );
</script>

<svelte:head>
  <link rel="preload" as="image" href="/{movie.id}-360w.webp" fetchpriority="high" />
</svelte:head>

<div class="relative">
  <div in:fade={{ duration: 220 }} class="sticky top-[calc(100dvh-5.5rem)] z-40 h-0 sm:hidden">
    <div class="flex w-full justify-center px-4 pb-3">
      <div class="flex flex-col items-center gap-2">
        <div class="flex justify-center">
          <CinemaSelect
            cinemaOptions={cinema_options}
            selectedChoice={selected_choice}
            onSelect={updateCinema}
            id="select-cinemas-movie-mobile" />
        </div>
        <div class="flex justify-center">
          <DayPicker selectedDay={selected_day} onSelect={updateDay} size="sm" />
        </div>
      </div>
    </div>
  </div>

  <div class="container mx-auto max-w-7xl py-4 pb-28 md:px-8 md:py-8 lg:px-12 lg:py-10">
    <button
      type="button"
      onclick={() => history.back()}
      class="mb-4 inline-flex cursor-pointer items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-white md:mb-6">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Til baka
    </button>
    <div class="grid gap-6 md:grid-cols-[320px_1fr] md:gap-8 lg:grid-cols-[400px_1fr] lg:gap-10 xl:grid-cols-[480px_1fr] xl:gap-12">
      <!-- Poster (desktop) / Trailer (mobile if available) -->
      <div class="w-full md:mx-0">
        <!-- Mobile: Show trailer thumbnail if available, otherwise poster -->
        {#if youtube_id}
          <div in:fade={{ duration: 260 }} class="aspect-video overflow-hidden rounded-md bg-neutral-900 md:hidden">
            <button type="button" onclick={openTrailer} class="group relative h-full w-full cursor-pointer">
              <img
                src="https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg"
                alt="Trailer"
                width="1280"
                height="720"
                fetchpriority="high"
                loading="eager"
                decoding="async"
                class="h-full w-full object-cover" />
              <div class="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 transition-transform group-hover:scale-110">
                  <svg class="ml-0.5 h-6 w-6 text-neutral-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        {:else}
          <!-- Mobile fallback: poster if no trailer -->
          <picture class="block md:hidden">
            <source type="image/webp" srcset={`/${movie.id}-360w.webp 360w, /${movie.id}.webp 720w`} sizes="100vw" />
            <img
              src={`/${movie.id}.webp`}
              title={movie.title}
              alt={movie.title}
              width="720"
              height="1080"
              fetchpriority="high"
              loading="eager"
              decoding="async"
              style:view-transition-name="poster-{movie.id}"
              in:fade={{ duration: 260 }}
              class="w-full rounded-md shadow-2xl" />
          </picture>
        {/if}
        <!-- Desktop: Always show poster -->
        <picture in:fade={{ duration: 260 }} class="hidden md:block">
          <source
            type="image/webp"
            srcset={`/${movie.id}-360w.webp 360w, /${movie.id}.webp 720w`}
            sizes="(max-width: 768px) 192px, 320px" />
          <img
            src={`/${movie.id}.webp`}
            title={movie.title}
            alt={movie.title}
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
          <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
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
            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 md:hidden">
              <MovieRatings {movie} />
            </div>
          {/if}
        </div>

        <p class="text-sm leading-relaxed text-neutral-400 md:text-base">{movie.description}</p>

        <!-- Trailer (desktop only - mobile shows in hero position) -->
        {#if youtube_id}
          <div in:fade={{ duration: 260 }} class="hidden aspect-video overflow-hidden rounded-md bg-neutral-900 md:block">
            <button type="button" onclick={openTrailer} class="group relative h-full w-full cursor-pointer">
              <img
                src="https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg"
                alt="Trailer"
                width="1280"
                height="720"
                loading="lazy"
                decoding="async"
                class="h-full w-full object-cover" />
              <div class="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 transition-transform group-hover:scale-110">
                  <svg class="ml-0.5 h-5 w-5 text-neutral-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        {/if}

        <!-- Showtimes -->
        <div class="pt-2 md:max-w-3xl">
          <div class="mb-5 hidden flex-wrap items-center gap-x-3 gap-y-2 sm:flex">
            <DayPicker selectedDay={selected_day} onSelect={updateDay} shrink />
            <CinemaSelect
              cinemaOptions={cinema_options}
              selectedChoice={selected_choice}
              onSelect={updateCinema}
              id="select-cinemas-movie-desktop"
              size="sm" />
          </div>

          <!-- eslint-disable svelte/no-navigation-without-resolve -->
          {#key `${selected_day}-${selected_choice}`}
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

<!-- Trailer Modal -->
{#if trailer_modal_open && youtube_id}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label="Trailer">
    <button
      type="button"
      onclick={closeTrailerModal}
      aria-label="Loka"
      class="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="absolute inset-0" onclick={closeTrailerModal} onkeydown={(e) => e.key === "Escape" && closeTrailerModal()}></div>
    <div class="relative aspect-video w-full max-w-5xl">
      <iframe
        src="https://www.youtube.com/embed/{youtube_id}?autoplay=1&rel=0&modestbranding=1"
        title="Trailer"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        class="h-full w-full rounded-lg"></iframe>
    </div>
  </div>
{/if}
