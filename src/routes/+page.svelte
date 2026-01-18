<script lang="ts">
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";

  import { in_range, to_float } from "$lib/util";
  import type { Movie, Showtime } from "$lib/schemas";
  import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice, cinemaState } from "$lib/cinema-state.svelte";
  import { dayState } from "$lib/day-state.svelte";

  const { data } = $props();
  const movies = $derived(data.movies);
  const cinema_options = $derived(data.cinema_options);

  // Always show days 0-3 for consistent UI
  const available_days = ["0", "1", "2", "3"];

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

  // Read cinema and day from shared state
  const selected_choice = $derived(cinemaState.value ?? DEFAULT_CINEMA_CHOICE);
  const selected_cinemas = $derived(get_cinemas_for_choice(selected_choice, cinema_options));
  const selected_day = $derived(dayState.value ?? "0");

  // Day selector slider (desktop)
  let day_buttons: HTMLButtonElement[] = $state([]);
  let slider_style = $state("width: 0; left: 0; opacity: 0;");
  let slider_animated = $state(false);

  // Day selector slider (mobile)
  let day_buttons_mobile: HTMLButtonElement[] = $state([]);
  let slider_style_mobile = $state("width: 0; left: 0; opacity: 0;");
  let slider_animated_mobile = $state(false);

  $effect(() => {
    const idx = parseInt(selected_day);
    const btn = day_buttons[idx];
    if (btn) {
      slider_style = `width: ${btn.offsetWidth}px; left: ${btn.offsetLeft}px; opacity: 1;`;
      if (!slider_animated) {
        requestAnimationFrame(() => {
          slider_animated = true;
        });
      }
    }
    const btnMobile = day_buttons_mobile[idx];
    if (btnMobile) {
      slider_style_mobile = `width: ${btnMobile.offsetWidth}px; left: ${btnMobile.offsetLeft}px; opacity: 1;`;
      if (!slider_animated_mobile) {
        requestAnimationFrame(() => {
          slider_animated_mobile = true;
        });
      }
    }
  });

  const updateCinema = (choiceLabel: string) => {
    cinemaState.set(choiceLabel);
  };

  const updateDay = (day: string) => {
    dayState.set(day);
  };

  const handleSelectChange = (event: Event & { currentTarget: HTMLSelectElement }) => {
    updateCinema(event.currentTarget.value);
  };

  let filtered_cinemas_showtimes = $derived(
    movies
      .filter((movie) => {
        const day_showtimes = movie.showtimes_by_day[selected_day] ?? {};
        const totalValidShowtimes = Object.entries(day_showtimes)
          .filter(([cinema]) => selected_cinemas.includes(cinema))
          .reduce((total, [, times]) => {
            // Only filter by time for today
            if (selected_day === "0") {
              const validTimes = (times as Showtime[]).filter(({ time }) => time && in_range(to_float(time), from, to));
              return total + validTimes.length;
            }
            return total + (times as Showtime[]).length;
          }, 0);
        return totalValidShowtimes > 0;
      })
      .sort((a, b) => {
        const getTotalValidShowtimes = (movie: Movie) => {
          const day_showtimes = movie.showtimes_by_day[selected_day] ?? {};
          return Object.entries(day_showtimes)
            .filter(([cinema]) => selected_cinemas.includes(cinema))
            .reduce((total, [, times]) => {
              if (selected_day === "0") {
                const validTimes = (times as Showtime[]).filter(({ time }) => time && in_range(to_float(time), from, to));
                return total + validTimes.length;
              }
              return total + (times as Showtime[]).length;
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
  <h1 class="mb-4 text-center text-5xl tracking-tight text-pretty" style="font-family: 'Space Grotesk', sans-serif;">Hvað er í bíó? 🍿</h1>
  <div class="mx-auto sm:block md:max-w-2xl lg:max-w-3xl">
    <!-- Cinema selection -->
    <div class="mb-5 flex flex-wrap justify-center gap-1.5 md:gap-2">
      {#each cinema_options as [label] (label)}
        <button
          type="button"
          onclick={() => updateCinema(label)}
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
    <!-- Day selection -->
    <div class="flex justify-center">
      <div class="relative flex items-center rounded-full bg-neutral-800 p-1">
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
    </div>
  </div>
</header>

<header class="relative">
  <div class="fixed inset-x-0 bottom-0 z-40 w-full px-4 pb-4 sm:hidden">
    <div class="flex flex-col gap-2">
      <!-- Cinema dropdown -->
      <div class="flex justify-center">
        <div class="relative">
          <select
            value={selected_choice}
            onchange={handleSelectChange}
            id="select-cinemas-mobile"
            name="select cinemas mobile"
            aria-label="Veldu kvikmyndahús"
            class="appearance-none rounded-full border border-neutral-700/50 bg-neutral-900/95 py-2 pr-8 pl-4 text-center text-sm text-neutral-100 shadow-lg focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none">
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
            <svg
              class="h-4 w-4 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.29a.75.75 0 01.02-1.06z"
                clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <!-- Day pills -->
      <div class="flex justify-center">
        <div class="relative flex items-center rounded-full bg-neutral-800/90 p-1">
          <!-- Sliding indicator -->
          <div
            class="absolute h-[calc(100%-14px)] rounded-full bg-white shadow-md {slider_animated_mobile
              ? 'transition-all duration-300 ease-out'
              : ''}"
            style={slider_style_mobile}>
          </div>
          {#each available_days as day, i (day)}
            <button
              bind:this={day_buttons_mobile[i]}
              type="button"
              onclick={() => updateDay(day)}
              class="relative z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 {selected_day === day
                ? 'text-neutral-900'
                : 'text-neutral-400'}">
              {get_day_label(day)}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</header>

{#if filtered_cinemas_showtimes.length === 0}
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <p class="text-lg text-neutral-400">Engar sýningar fundust</p>
    <p class="mt-1 text-sm text-neutral-500">Prófaðu að velja annan dag eða kvikmyndahús</p>
  </div>
{:else}
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
            style:view-transition-name="poster-{movie.id}"
            class="shadow-5xl pointer-events-none h-full w-full rounded-lg object-fill [@media(hover:hover)]:transition-transform [@media(hover:hover)]:duration-300 [@media(hover:hover)]:ease-out [@media(hover:hover)]:group-hover:scale-[1.02]" />
        </picture>
      </div>
    {/each}
  </div>
{/if}
