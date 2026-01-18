<script lang="ts">
  import { in_range, to_float } from "$lib/util";
  import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice, cinemaState } from "$lib/cinema-state.svelte";
  import { CINEMA_URLS } from "$lib/constants";
  import { dayState } from "$lib/day-state.svelte";

  const { data } = $props();
  const movie = $derived(data.movie);
  const cinema_options = $derived(data.cinema_options);

  // Extract YouTube video ID from trailer URL
  const youtube_id = $derived(movie.trailer_url?.match(/(?:v=|\/vi\/)([^&?/]+)/)?.[1]);

  const to = 24;
  const from = Math.min(21, new Date().getHours());

  // Read cinema from shared state
  const selected_choice = $derived(cinemaState.value ?? DEFAULT_CINEMA_CHOICE);
  const selected_cinemas = $derived(get_cinemas_for_choice(selected_choice, cinema_options));

  // Day selection from shared state
  const selected_day = $derived(dayState.value ?? "0");
  let play_trailer = $state(false);
  // Always show days 0-3 for consistent UI
  const available_days = ["0", "1", "2", "3"];

  // Day selector slider
  let day_buttons: HTMLButtonElement[] = $state([]);
  let slider_style = $state("width: 0; left: 0; opacity: 0;");
  let slider_animated = $state(false);

  $effect(() => {
    const idx = parseInt(selected_day);
    const btn = day_buttons[idx];
    if (btn) {
      slider_style = `width: ${btn.offsetWidth}px; left: ${btn.offsetLeft}px; opacity: 1;`;
      // Enable animation after first position is set
      if (!slider_animated) {
        requestAnimationFrame(() => {
          slider_animated = true;
        });
      }
    }
  });

  const updateDay = (day: string) => {
    dayState.set(day);
  };

  const get_day_label = (day: string) => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const date = new Date();
    date.setDate(date.getDate() + parseInt(day));
    if (day === "0") return "Í dag";
    if (day === "1") return "Á morgun";
    const d = date.getDate();
    const month = date.toLocaleDateString("is-IS", { month: "short" }).toLowerCase().replace(".", "");
    return `${d}. ${month}`;
  };

  const current_showtimes = $derived(movie.showtimes_by_day[selected_day] ?? {});
</script>

<svelte:head>
  <link rel="preload" as="image" href="/{movie.id}-360w.webp" fetchpriority="high" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-8 lg:px-12 lg:py-10">
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
      <!-- Mobile: Show trailer if available, otherwise poster -->
      {#if youtube_id}
        <div class="aspect-video overflow-hidden rounded-md bg-neutral-900 md:hidden">
          {#if play_trailer}
            <iframe
              src="https://www.youtube.com/embed/{youtube_id}?autoplay=1&rel=0&modestbranding=1"
              title="Trailer"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              class="h-full w-full"></iframe>
          {:else}
            <button type="button" onclick={() => (play_trailer = true)} class="group relative h-full w-full cursor-pointer">
              <img
                src="https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg"
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
          {/if}
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
            class="w-full rounded-md shadow-2xl" />
        </picture>
      {/if}
      <!-- Desktop: Always show poster -->
      <picture class="hidden md:block">
        <source type="image/webp" srcset={`/${movie.id}-360w.webp 360w, /${movie.id}.webp 720w`} sizes="(max-width: 768px) 192px, 320px" />
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
          <!-- Ratings inline on desktop -->
          <!-- eslint-disable svelte/no-navigation-without-resolve -->
          {#if movie.imdb}
            <span class="hidden md:inline">·</span>
            <a
              href={movie.imdb.link}
              target="_blank"
              rel="external noopener noreferrer"
              class="hidden items-center gap-1 text-neutral-500 hover:text-white md:inline-flex">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32" width="28" height="14" class="fill-[#F5C518]">
                <rect rx="3" width="64" height="32" />
                <text x="32" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#000"
                  >IMDb</text>
              </svg>
              <span>{movie.imdb.star}</span>
            </a>
          {/if}
          {#if movie.rotten_tomatoes}
            <span class="hidden md:inline">·</span>
            <a
              href={movie.rotten_tomatoes.url ??
                `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.alt_title || movie.title)}`}
              target="_blank"
              rel="external noopener noreferrer"
              class="hidden items-center gap-1 text-neutral-500 hover:text-white md:inline-flex">
              <img src="/rotten-tomatoes.svg" alt="RT" width="14" height="14" />
              <span>{movie.rotten_tomatoes.score}%</span>
            </a>
          {/if}
          {#if movie.metacritic}
            <span class="hidden md:inline">·</span>
            <a
              href={movie.metacritic.url ?? `https://www.metacritic.com/search/${encodeURIComponent(movie.alt_title || movie.title)}/`}
              target="_blank"
              rel="external noopener noreferrer"
              class="hidden items-center gap-1 text-neutral-500 hover:text-white md:inline-flex">
              <img src="/metacritic.svg" alt="MC" width="14" height="14" />
              <span>{movie.metacritic.score}</span>
            </a>
          {/if}
          {#if movie.letterboxd?.score}
            <span class="hidden md:inline">·</span>
            <a
              href={movie.letterboxd.url ?? `https://letterboxd.com/search/${encodeURIComponent(movie.alt_title || movie.title)}/`}
              target="_blank"
              rel="external noopener noreferrer"
              class="hidden items-center gap-1 text-neutral-500 hover:text-white md:inline-flex">
              <img src="/letterboxd.svg" alt="LB" width="14" height="14" />
              <span>{movie.letterboxd.score}</span>
            </a>
          {/if}
        </div>

        <!-- Ratings row - mobile only -->
        {#if movie.imdb || movie.rotten_tomatoes || movie.metacritic || movie.letterboxd}
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 md:hidden">
            {#if movie.imdb}
              <a
                href={movie.imdb.link}
                target="_blank"
                rel="external noopener noreferrer"
                class="inline-flex items-center gap-1 text-neutral-500 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32" width="28" height="14" class="fill-[#F5C518]">
                  <rect rx="3" width="64" height="32" />
                  <text x="32" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#000"
                    >IMDb</text>
                </svg>
                <span>{movie.imdb.star}</span>
              </a>
            {/if}
            {#if movie.rotten_tomatoes}
              <a
                href={movie.rotten_tomatoes.url ??
                  `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.alt_title || movie.title)}`}
                target="_blank"
                rel="external noopener noreferrer"
                class="inline-flex items-center gap-1 text-neutral-500 hover:text-white">
                <img src="/rotten-tomatoes.svg" alt="RT" width="14" height="14" />
                <span>{movie.rotten_tomatoes.score}%</span>
                {#if movie.rotten_tomatoes.audience_score}
                  <span class="text-neutral-600">({movie.rotten_tomatoes.audience_score}%)</span>
                {/if}
              </a>
            {/if}
            {#if movie.metacritic}
              <a
                href={movie.metacritic.url ?? `https://www.metacritic.com/search/${encodeURIComponent(movie.alt_title || movie.title)}/`}
                target="_blank"
                rel="external noopener noreferrer"
                class="inline-flex items-center gap-1 text-neutral-500 hover:text-white">
                <img src="/metacritic.svg" alt="MC" width="14" height="14" />
                <span>{movie.metacritic.score}</span>
                {#if movie.metacritic.user_score}
                  <span class="text-neutral-600">({movie.metacritic.user_score})</span>
                {/if}
              </a>
            {/if}
            {#if movie.letterboxd?.score}
              <a
                href={movie.letterboxd.url ?? `https://letterboxd.com/search/${encodeURIComponent(movie.alt_title || movie.title)}/`}
                target="_blank"
                rel="external noopener noreferrer"
                class="inline-flex items-center gap-1 text-neutral-500 hover:text-white">
                <img src="/letterboxd.svg" alt="LB" width="14" height="14" />
                <span>{movie.letterboxd.score}</span>
              </a>
            {/if}
          </div>
        {/if}
      </div>

      <p class="text-sm leading-relaxed text-neutral-400 md:text-base">{movie.description}</p>

      <!-- Trailer (desktop only - mobile shows in hero position) -->
      {#if youtube_id}
        <div class="hidden aspect-video overflow-hidden rounded-md bg-neutral-900 md:block">
          {#if play_trailer}
            <iframe
              src="https://www.youtube.com/embed/{youtube_id}?autoplay=1&rel=0&modestbranding=1"
              title="Trailer"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              class="h-full w-full"></iframe>
          {:else}
            <button type="button" onclick={() => (play_trailer = true)} class="group relative h-full w-full cursor-pointer">
              <img
                src="https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg"
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
          {/if}
        </div>
      {/if}

      <!-- Showtimes -->
      {#if available_days.length > 0}
        <div class="pt-2">
          <div class="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div class="relative flex shrink-0 items-center rounded-full bg-neutral-800 p-1">
              <!-- Sliding indicator -->
              <div
                class="absolute h-[calc(100%-14px)] rounded-full bg-white {slider_animated ? 'transition-all duration-300 ease-out' : ''}"
                style={slider_style}>
              </div>
              {#each available_days as day, i (day)}
                <button
                  bind:this={day_buttons[i]}
                  type="button"
                  onclick={() => updateDay(day)}
                  class="relative z-10 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 {selected_day === day
                    ? 'text-neutral-900'
                    : 'text-neutral-400 hover:text-neutral-200'}">
                  {get_day_label(day)}
                </button>
              {/each}
            </div>
            {#if selected_choice !== DEFAULT_CINEMA_CHOICE}
              <button
                type="button"
                onclick={() => cinemaState.set(DEFAULT_CINEMA_CHOICE)}
                class="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 py-1 pr-1.5 pl-3 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white">
                <span class="max-w-[120px] truncate">{selected_choice}</span>
                <span class="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-600 transition-colors hover:bg-neutral-500">
                  <svg class="h-2.5 w-2.5 text-neutral-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </button>
            {/if}
          </div>

          <!-- eslint-disable svelte/no-navigation-without-resolve -->
          <div class="space-y-5">
            {#each Object.entries(current_showtimes) as [cinema, times] (cinema)}
              {#if selected_cinemas.includes(cinema)}
                {@const validTimes = selected_day === "0" ? times.filter(({ time }) => time && in_range(to_float(time), from, to)) : times}
                {#if validTimes.length > 0}
                  <div class="flex flex-col gap-1.5 md:grid md:grid-cols-[auto_1fr] md:items-baseline md:gap-x-3 md:gap-y-0">
                    {#if CINEMA_URLS[cinema]}
                      <a
                        href={CINEMA_URLS[cinema]}
                        target="_blank"
                        rel="external noopener noreferrer"
                        class="text-sm font-medium text-neutral-300 underline decoration-neutral-600 underline-offset-2 transition-colors hover:text-white hover:decoration-neutral-400"
                        >{cinema}</a>
                    {:else}
                      <span class="text-sm font-medium text-neutral-300">{cinema}</span>
                    {/if}
                    <div class="flex flex-wrap gap-2">
                      {#each validTimes as { time, purchase_url, is_icelandic, is_3d, is_luxus, is_vip, is_atmos, is_max, is_flauel } (purchase_url)}
                        <a
                          href={purchase_url}
                          target="_blank"
                          rel="external noopener noreferrer"
                          class="relative rounded bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-400 tabular-nums transition-colors hover:bg-neutral-700 hover:text-white">
                          {#if is_icelandic || is_3d || is_luxus || is_vip || is_atmos || is_max || is_flauel}
                            <span class="absolute -top-1.5 -right-1.5 flex gap-0.5">
                              {#if is_icelandic}
                                <svg class="h-2.5 w-3" viewBox="0 0 25 18" fill="none">
                                  <rect width="25" height="18" fill="#003897" />
                                  <rect x="7" width="4" height="18" fill="#fff" />
                                  <rect y="7" width="25" height="4" fill="#fff" />
                                  <rect x="8" width="2" height="18" fill="#D72828" />
                                  <rect y="8" width="25" height="2" fill="#D72828" />
                                </svg>
                              {/if}
                              {#if is_3d}
                                <span class="rounded bg-blue-600 px-0.5 text-[8px] font-bold text-white">3D</span>
                              {/if}
                              {#if is_luxus}
                                <span class="rounded bg-yellow-500 px-0.5 text-[8px] font-bold text-black">LÚX</span>
                              {/if}
                              {#if is_vip}
                                <span class="rounded bg-emerald-600 px-0.5 text-[8px] font-bold text-white">VIP</span>
                              {/if}
                              {#if is_atmos}
                                <span class="rounded bg-purple-600 px-0.5 text-[8px] font-bold text-white">ÁSBERG</span>
                              {/if}
                              {#if is_max}
                                <span class="rounded bg-red-600 px-0.5 text-[8px] font-bold text-white">MAX</span>
                              {/if}
                              {#if is_flauel}
                                <span class="rounded bg-pink-500 px-0.5 text-[8px] font-bold text-white">FLAUEL</span>
                              {/if}
                            </span>
                          {/if}
                          {new Date(time).toLocaleTimeString("is-IS", { timeStyle: "short", hour12: false })}
                        </a>
                      {/each}
                    </div>
                  </div>
                {/if}
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
