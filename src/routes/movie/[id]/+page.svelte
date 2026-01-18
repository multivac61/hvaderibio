<script lang="ts">
  import { resolve } from "$app/paths";
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
  const available_days = $derived(Object.keys(movie.showtimes_by_day).sort());

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
  <a href={resolve("/")} class="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-white md:mb-6">
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
    Til baka
  </a>
  <div class="grid gap-6 md:grid-cols-[320px_1fr] md:gap-8 lg:grid-cols-[400px_1fr] lg:gap-10 xl:grid-cols-[480px_1fr] xl:gap-12">
    <!-- Poster -->
    <div class="w-full md:mx-0">
      <picture class="block">
        <source type="image/webp" srcset={`/${movie.id}-360w.webp 360w, /${movie.id}.webp 720w`} sizes="(max-width: 768px) 192px, 320px" />
        <img
          src={`/${movie.id}.webp`}
          title={movie.title}
          alt={movie.title}
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

        <!-- Meta row: year, duration, genres -->
        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
          <span>{movie.release_year}</span>
          <span>·</span>
          <span>{movie.duration_in_mins} mín</span>
          {#if movie.genres.length > 0}
            <span>·</span>
            <span>{movie.genres.slice(0, 2).join(", ")}</span>
          {/if}
        </div>

        <!-- Ratings -->
        <!-- eslint-disable svelte/no-navigation-without-resolve -->
        {#if movie.imdb || movie.rotten_tomatoes || movie.metacritic}
          <div class="mt-3 flex items-center gap-4 text-sm">
            {#if movie.imdb}
              <a
                href={movie.imdb.link}
                target="_blank"
                rel="external noopener noreferrer"
                class="flex items-center gap-1 text-neutral-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32" width="32" height="16" class="fill-[#F5C518]">
                  <rect rx="3" width="64" height="32" />
                  <text x="32" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#000"
                    >IMDb</text>
                </svg>
                <span class="font-medium">{movie.imdb.star}</span>
              </a>
            {/if}
            {#if movie.rotten_tomatoes}
              <a
                href={movie.rotten_tomatoes.url ??
                  `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.alt_title || movie.title)}`}
                target="_blank"
                rel="external noopener noreferrer"
                class="flex items-center gap-1 text-neutral-400 hover:text-white">
                <img src="/rotten-tomatoes.svg" alt="RT" width="16" height="16" />
                <span class="font-medium">{movie.rotten_tomatoes.score}%</span>
              </a>
            {/if}
            {#if movie.metacritic}
              <a
                href={movie.metacritic.url ?? `https://www.metacritic.com/search/${encodeURIComponent(movie.alt_title || movie.title)}/`}
                target="_blank"
                rel="external noopener noreferrer"
                class="flex items-center gap-1 text-neutral-400 hover:text-white">
                <img src="/metacritic.svg" alt="MC" width="16" height="16" />
                <span class="font-medium">{movie.metacritic.score}</span>
              </a>
            {/if}
          </div>
        {/if}
      </div>

      <p class="text-sm leading-relaxed text-neutral-400 md:text-base">{movie.description}</p>

      <!-- Trailer -->
      {#if youtube_id}
        <div class="aspect-video overflow-hidden rounded-md bg-neutral-900">
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
              <img src="https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg" alt="Trailer" class="h-full w-full object-cover" />
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
          <div class="mb-4 flex items-center gap-1.5">
            <div class="flex items-center gap-1">
              {#each available_days as day (day)}
                <button
                  type="button"
                  onclick={() => updateDay(day)}
                  class="rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 {selected_day === day
                    ? 'bg-white text-neutral-900 scale-105 shadow-md'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 hover:scale-102'}">
                  {get_day_label(day)}
                </button>
              {/each}
            </div>
            {#if selected_choice !== DEFAULT_CINEMA_CHOICE}
              <button
                type="button"
                onclick={() => cinemaState.set(DEFAULT_CINEMA_CHOICE)}
                class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-800 py-1 pr-1.5 pl-3 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white">
                <span class="truncate">{selected_choice}</span>
                <span class="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700 transition-colors hover:bg-neutral-600">
                  <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
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
                  <div class="grid grid-cols-[auto_1fr] items-baseline gap-x-3">
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
                    <div class="flex flex-wrap gap-1.5">
                      {#each validTimes as { time, purchase_url, is_icelandic, is_3d, is_luxus, is_vip, is_atmos, is_max, is_flauel } (purchase_url)}
                        <a
                          href={purchase_url}
                          target="_blank"
                          rel="external noopener noreferrer"
                          class="relative rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-400 tabular-nums transition-colors hover:bg-neutral-700 hover:text-white">
                          {#if is_icelandic || is_3d || is_luxus || is_vip || is_atmos || is_max || is_flauel}
                            <span class="absolute -top-1.5 -right-1.5 flex gap-0.5">
                              {#if is_icelandic}
                                <svg class="h-2.5 w-3" viewBox="0 0 25 18" fill="none">
                                  <rect width="25" height="18" fill="#003897"/>
                                  <rect x="7" width="4" height="18" fill="#fff"/>
                                  <rect y="7" width="25" height="4" fill="#fff"/>
                                  <rect x="8" width="2" height="18" fill="#D72828"/>
                                  <rect y="8" width="25" height="2" fill="#D72828"/>
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
