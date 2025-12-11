<script lang="ts">
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  import { in_range, to_float } from "$lib/util";
  import type { Movie, Showtime } from "$lib/schemas";
  import { getMovies, getCinemaOptions } from "$lib/data.remote";
  import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice } from "$lib/cinema-state.svelte";

  const movies = await getMovies();
  const cinema_options = await getCinemaOptions();

  // Handle touch events to bypass iOS Safari tap issues
  let touchStartY = 0;

  const createTouchHandlers = (href: string) => ({
    handleTouchStart: (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    },
    handleTouchEnd: (e: TouchEvent) => {
      // Only navigate if it wasn't a scroll (touch moved less than 10px)
      const touchEndY = e.changedTouches[0].clientY;
      if (Math.abs(touchEndY - touchStartY) < 10) {
        e.preventDefault();
        // @ts-expect-error - Dynamic route navigation
        goto(resolve(href));
      }
    },
    handleClick: () => {
      // Fallback for non-touch devices
      // @ts-expect-error - Dynamic route navigation
      goto(resolve(href));
    },
  });

  const to = $state(24);
  const from = $derived(Math.min(21, new Date().getHours()));

  // Read cinema from URL, fallback to default
  const selected_choice = $derived(page.url.searchParams.get("cinema") ?? DEFAULT_CINEMA_CHOICE);
  const selected_cinemas = $derived(get_cinemas_for_choice(selected_choice, cinema_options));

  const updateSelection = (choiceLabel: string) => {
    const url = new URL(page.url);
    if (choiceLabel === DEFAULT_CINEMA_CHOICE) {
      url.searchParams.delete("cinema");
    } else {
      url.searchParams.set("cinema", choiceLabel);
    }
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(url, { replaceState: true, noScroll: true, keepFocus: true });
  };

  const handleSelectChange = (event: Event & { currentTarget: HTMLSelectElement }) => {
    updateSelection(event.currentTarget.value);
  };

  let filtered_cinemas_showtimes = $derived(
    movies
      .filter((movie) => {
        const totalValidShowtimes = Object.entries(movie.cinema_showtimes)
          .filter(([cinema]) => selected_cinemas.includes(cinema))
          .reduce((total, [, times]) => {
            const validTimes = (times as Showtime[]).filter(({ time }) => time && in_range(to_float(time), from, to));
            return total + validTimes.length;
          }, 0);
        return totalValidShowtimes > 0;
      })
      .sort((a, b) => {
        const getTotalValidShowtimes = (movie: Movie) => {
          return Object.entries(movie.cinema_showtimes)
            .filter(([cinema]) => selected_cinemas.includes(cinema))
            .reduce((total, [, times]) => {
              const validTimes = (times as Showtime[]).filter(({ time }) => time && in_range(to_float(time), from, to));
              return total + validTimes.length;
            }, 0);
        };
        return getTotalValidShowtimes(b) - getTotalValidShowtimes(a);
      })
  );
</script>

<svelte:head>
  <title>Hvað er í bíó? - Bíódagskrá kvöldsins</title>
  <meta name="description" content="Fljótlegt yfirlit yfir bíódagskrá kvöldsins á öllu landinu. Skoðaðu sýningartíma og bókaðu miða." />
</svelte:head>

<header class="relative hidden sm:my-8 sm:block">
  <h1 class="mb-4 bg-clip-text text-center text-5xl text-pretty accent-cyan-50">Hvað er í bíó? 🍿</h1>
  <div class="mx-auto sm:block md:max-w-2xl lg:max-w-3xl">
    <div class="flex flex-wrap justify-center gap-1.5 md:gap-2">
      {#each cinema_options as [label] (label)}
        <button
          type="button"
          onclick={() => updateSelection(label)}
          class={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-900 focus:outline-none
                    ${
                      label === selected_choice
                        ? "bg-opacity-15 bg-neutral-800/30 text-white shadow-sm"
                        : "bg-neutral-800/60 text-neutral-400 hover:bg-neutral-700/80 hover:text-neutral-200"
                    }
                  `}>
          {label}
        </button>
      {/each}
    </div>
  </div>
</header>

<header class="relative">
  <div class="fixed inset-x-0 bottom-0 z-40 w-full px-16 pb-4 sm:hidden">
    <div class="relative w-full">
      <select
        value={selected_choice}
        onchange={handleSelectChange}
        id="select-cinemas-mobile"
        name="select cinemas mobile"
        aria-label="Veldu kvikmyndahús"
        class="block w-full appearance-none rounded-lg border border-neutral-700/50 bg-neutral-900/95 py-2.5 pr-10 pl-4 text-center text-base text-neutral-100 shadow-lg [text-align-last:center] focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none">
        {#each cinema_options as [label] (label)}
          <option
            value={label}
            id={`option-${label}`}
            aria-label={label}
            selected={label === selected_choice}
            class="bg-neutral-800 text-center text-white">
            {label}
          </option>
        {/each}
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg class="h-5 w-5 text-neutral-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.29a.75.75 0 01.02-1.06z"
            clip-rule="evenodd" />
        </svg>
      </div>
    </div>
  </div>
</header>

<div
  class="md:md-30 mb-24 grid grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] gap-4 sm:mb-8 sm:grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),2fr))] sm:gap-6 sm:pt-4">
  {#each filtered_cinemas_showtimes as movie, index (movie.id)}
    {@const handlers = createTouchHandlers(`/movie/${movie.id}`)}
    <div
      role="button"
      tabindex="0"
      data-movie-id={movie.id}
      ontouchstart={handlers.handleTouchStart}
      ontouchend={handlers.handleTouchEnd}
      onclick={handlers.handleClick}
      onkeydown={(e) => (e.key === "Enter" || e.key === " ") && handlers.handleClick()}
      class="group block aspect-2/3 w-full touch-manipulation overflow-visible rounded-lg bg-neutral-900 [@media(hover:hover)]:hover:z-50"
      style="cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; -webkit-user-select: none;">
      <picture>
        <source
          type="image/webp"
          srcset="/{movie.id}-360w.webp 360w, /{movie.id}.webp 720w, /{movie.id}-1080w.webp 1080w"
          sizes="(max-width: 640px) calc(50vw - 2rem), 360px" />
        <img
          src="/{movie.id}.webp"
          alt={movie.title}
          title={movie.title}
          fetchpriority={index < 4 ? "high" : "auto"}
          loading="eager"
          decoding="async"
          width="720"
          height="1080"
          class="shadow-5xl pointer-events-none h-full w-full rounded-lg object-fill [@media(hover:hover)]:transition-transform [@media(hover:hover)]:duration-300 [@media(hover:hover)]:ease-out [@media(hover:hover)]:group-hover:scale-[1.02]" />
      </picture>
    </div>
  {/each}
</div>
