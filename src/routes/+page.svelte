<script lang="ts">
  import { resolve } from "$app/paths";

  import { in_range, to_float } from "$lib/util";
  import type { Movie, Showtime } from "$lib/schemas";

  let { data } = $props();

  const to = $state(24);
  // Use a consistent time for both server and client to avoid layout shifts
  // We'll use the current hour as the baseline for consistency
  const from = $derived(Math.min(21, new Date().getHours()));

  const all_cinemas = data.movies
    .flatMap((movie) => Object.keys(movie.cinema_showtimes))
    .filter((name, index, array) => array.indexOf(name) === index)
    .sort();

  const capital_region_cinemas = all_cinemas.filter((name) =>
    ["Bíó Paradís", "Háskólabíó", "Laugarásbíó", "Sambíóin Egilshöll", "Sambíóin Kringlunni", "Sambíóin Álfabakka", "Smárabíó"].includes(
      name
    )
  );

  const all_choices = all_cinemas.map((name) => [name, [name]] as const);

  const group_choices = [
    ["Öll kvikmyndahús", all_cinemas],
    ["Höfuðborgarsvæðið", capital_region_cinemas],
  ] as const;

  // Initialize with default, will be updated on client side
  let selected_choice: string = $state(group_choices[1][0]);
  let selected_cinemas: string[] = $state(capital_region_cinemas);

  // Load saved selection from sessionStorage after component mounts
  $effect(() => {
    if (typeof window !== "undefined") {
      const savedChoice = sessionStorage.getItem("selectedCinemaChoice");
      if (savedChoice) {
        const cinemas = [...group_choices, ...all_choices].find(([label]) => label === savedChoice)?.[1];
        if (cinemas) {
          selected_choice = savedChoice;
          selected_cinemas = [...cinemas]; // Create mutable copy
        }
      }
    }
  });

  const updateSelection = (choiceLabel: string) => {
    if (selected_choice === choiceLabel) return;
    selected_choice = choiceLabel;
    selected_cinemas = [...group_choices, ...all_choices].flatMap(([group_label, cinemas]) => (group_label === choiceLabel ? cinemas : []));
    // Save to sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("selectedCinemaChoice", choiceLabel);
    }
  };

  const handleSelectChange = (event: Event & { currentTarget: HTMLSelectElement }) => {
    updateSelection(event.currentTarget.value);
  };

  let filtered_cinemas_showtimes = $derived(
    data.movies
      .filter((movie) => {
        // Count total valid showtimes for this movie in selected cinemas
        const totalValidShowtimes = Object.entries(movie.cinema_showtimes)
          .filter(([cinema]) => selected_cinemas.includes(cinema))
          .reduce((total, [, times]) => {
            const validTimes = (times as Showtime[]).filter(({ time }) => time && in_range(to_float(time), from, to));
            return total + validTimes.length;
          }, 0);

        // Only show movies that have at least one valid showtime in selected cinemas
        return totalValidShowtimes > 0;
      })
      .sort((a, b) => {
        // Count total valid showtimes for each movie across selected cinemas
        const getTotalValidShowtimes = (movie: Movie) => {
          return Object.entries(movie.cinema_showtimes)
            .filter(([cinema]) => selected_cinemas.includes(cinema))
            .reduce((total, [, times]) => {
              const validTimes = (times as Showtime[]).filter(({ time }) => time && in_range(to_float(time), from, to));
              return total + validTimes.length;
            }, 0);
        };

        const aCount = getTotalValidShowtimes(a);
        const bCount = getTotalValidShowtimes(b);

        // Sort by total valid showtimes (descending)
        return bCount - aCount;
      })
  );
</script>

<svelte:head>
  {#each filtered_cinemas_showtimes.slice(0, 4) as movie}
    <link rel="preload" as="image" href="/{movie.id}-360w.webp" fetchpriority="high" />
  {/each}
</svelte:head>

<header class="relative hidden sm:my-8 sm:block">
  <h1 class="mb-4 bg-clip-text text-center text-5xl text-pretty accent-cyan-50">Hvað er í bíó? 🍿</h1>
  <div class="mx-auto sm:block md:max-w-2xl lg:max-w-3xl">
    <div class="flex flex-wrap justify-center gap-1.5 md:gap-2">
      {#each [...group_choices, ...all_choices] as [label] (label)}
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
        {#each [...group_choices, ...all_choices] as [label] (label)}
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
  class="md:md-30 z-30 mb-24 grid grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] gap-4 sm:mb-8 sm:grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),2fr))] sm:gap-6 sm:pt-4"
  style="contain: layout style;">
  {#each filtered_cinemas_showtimes as movie, index (movie.id)}
    <a
      href={resolve(`/movie/${movie.id}`)}
      class="group block aspect-2/3 w-full overflow-visible rounded-lg bg-neutral-900 [@media(hover:hover)]:hover:z-50">
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
    </a>
  {/each}
</div>
