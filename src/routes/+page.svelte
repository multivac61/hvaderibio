<script lang="ts">
  import "../app.postcss";

  import { onMount } from "svelte";

  import { createDialog, melt } from "@melt-ui/svelte";

  import CinemaTab from "$lib/CinemaTab.svelte";
  import Dust from "$lib/Dust.svelte";

  import { in_range, to_float, flyAndScale } from "$lib/util";
  import type { Movie } from "$lib/schemas";

  const {
    elements: {
      trigger: about_trigger,
      portalled: about_portal,
      overlay: about_overlay,
      content: about_content,
      title: about_title,
      description: about_description,
      close: about_close,
    },
    states: { open: about_open },
  } = createDialog();

  const {
    elements: {
      trigger: movie_trigger,
      portalled: movie_portal,
      overlay: movie_overlay,
      content: movie_content,
      title: movie_title,
      description: movie_description,
      close: movie_close,
    },
    states: { open: movie_open },
  } = createDialog();

  export let data;

  let [from, to] = [Math.min(new Date().getHours(), 22), 24];

  onMount(() => {
    // Filter showtime again on the client
    from = Math.min(21, new Date().getHours() - 1);
  });

  let selected_movie: Movie | undefined;

  // Get all cinemas in data.movies
  const all_cinemas = data.movies
    .flatMap((movie) => Object.keys(movie.cinema_showtimes!))
    .filter((name: string, index: number, array: string[]) => array.indexOf(name) === index)
    .sort();

  $: filtered_cinemas_showtimes = data.movies.filter(
    (movie) =>
      Object.keys(movie.cinema_showtimes).some((c) => selected_cinemas.includes(c)) &&
      Object.values(movie.cinema_showtimes).some((times) => times.some(({ time }) => time && in_range(to_float(time), from, to)))
  );

  const capital_region_cinemas = all_cinemas.filter((name) =>
    ["Bíó Paradís", "Háskólabíó", "Laugarásbíó", "Sambíóin Egilshöll", "Sambíóin Kringlunni", "Sambíóin Álfabakka", "Smárabíó"].includes(
      name as string
    )
  );

  const all_choices = all_cinemas.map((name) => [name, [name]] as const);

  const group_choices = [
    ["Öll kvikmyndahús", all_cinemas],
    ["Höfuðborgarsvæðið", capital_region_cinemas],
  ] as const;

  let selected_choice: string = group_choices[1][0];
  let selected_cinemas = capital_region_cinemas;

  let width: number;
  let height: number;

  const change = (event: { currentTarget: HTMLSelectElement }) => {
    selected_choice = event.currentTarget.value;
    selected_cinemas = [...group_choices, ...all_choices].flatMap(([group_choice, cinemas]) =>
      group_choice === event.currentTarget.value ? cinemas : []
    );
  };
</script>

<svelte:window bind:outerWidth={width} bind:outerHeight={height} />

<header class="relative my-4 sm:my-8">
  <div class="flex flex-col items-start sm:py-4 md:items-center">
    <div class="pointer-events-none absolute w-full overflow-hidden">
      <Dust {width} {height} />
    </div>
    <h1>
      <button use:melt={$about_trigger} class="text-4xl font-black uppercase hover:text-yellow-500 sm:text-6xl">
        Hvað er í <span class="bg-gradient-to-br from-yellow-500 to-red-500 box-decoration-clone bg-clip-text text-transparent">bíó</span>?
      </button>
    </h1>
  </div>
  <div class="mb-4 hidden sm:block md:mx-auto md:max-w-xl">
    <div class="inline-flex flex-wrap gap-0.5 md:justify-center">
      {#each [...group_choices, ...all_choices] as [label, cinemas]}
        <CinemaTab
          {label}
          is_selected={label === selected_choice}
          on:click={() => {
            selected_choice = label;
            selected_cinemas = Array.from(cinemas);
          }} />
      {/each}
    </div>
  </div>
</header>

<div
  class="md:md-30 z-40 mb-8 grid grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(min(15rem,100%),2fr))] sm:gap-6">
  {#each filtered_cinemas_showtimes as movie (movie.title)}
    <button on:click={() => (selected_movie = movie)} use:melt={$movie_trigger} id={movie.title}>
      <img
        src={`${movie.id}.webp`}
        title={movie.title}
        alt={movie.title}
        class="aspect-[2/3] rounded-lg object-fill shadow-2xl sm:w-[min(100%,360px)] sm:transition-all sm:hover:z-50 sm:hover:scale-105" />
    </button>
  {/each}
</div>

{#if $movie_open && selected_movie}
  <div class="fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm transition-opacity sm:items-center" use:movie_portal>
    <div
      class="screen-height relative m-6 w-[min(100vw,640px)] overflow-y-auto rounded-2xl bg-neutral-950 p-4 shadow-xl transition-opacity sm:p-8"
      use:melt={$movie_overlay}>
      <div use:melt={$movie_content}>
        <h3 class="mb-2 text-lg font-bold text-neutral-200 md:text-2xl" use:melt={$movie_title}>{selected_movie.title}</h3>
        <div class="mb-4 mt-2 text-sm text-neutral-300" use:melt={$movie_description}>
          <p class="mb-4 text-neutral-400">{selected_movie.description}</p>
          <div class="group flex items-center gap-4">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={selected_movie.trailer_url}
              class="relative flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-300 hover:border-gray-400 hover:text-gray-400">
              <span
                class="absolute inset-0 rounded-md opacity-20 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-20" />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" class="fill-current">
                <path d="M3 22V2L21 12L3 22Z" />
              </svg>
              Stikla
            </a>
            {#if selected_movie.imdb}
              <div class="group">
                <a
                  href={selected_movie.imdb.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="relative rounded-md border border-[#f6c700] px-3 py-1 text-sm font-medium text-[#f6c700] hover:border-yellow-200 hover:text-yellow-200">
                  <span
                    class="absolute inset-0 rounded-md opacity-20 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-20" />
                  IMDb · {selected_movie.imdb.star}</a>
              </div>
            {/if}
          </div>
          <h2 class="my-6 text-sm text-neutral-400">{data.today}</h2>
          <div>
            <div class="space-y-4">
              {#each Object.entries(selected_movie.cinema_showtimes) as [cinema, times] (cinema)}
                <div>
                  <div class="mb-3 font-medium text-neutral-200">{cinema}</div>
                  <div class="inline-flex flex-wrap gap-3">
                    {#each times as { time, purchase_url } (purchase_url)}
                      <a
                        class="group relative rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 px-2.5 py-1 text-base tabular-nums text-neutral-300 hover:bg-neutral-700 hover:text-white"
                        href={purchase_url}>
                        <span
                          class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-10" />
                        {time &&
                          new Date(time).toLocaleTimeString("is-IS", {
                            timeStyle: "short",
                            hour12: false,
                          })}
                      </a>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
        <div class="sticky inset-0 bottom-0 isolate z-50 h-20 rounded-b-xl">
          <div class="pointer-events-none absolute -inset-x-4 -bottom-4 z-10 h-24 bg-gradient-to-t from-black sm:-inset-x-8 sm:-bottom-8" />
          <button
            class="group absolute inset-x-0 bottom-0 z-50 w-auto rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 px-2.5 py-2 text-base text-neutral-300 shadow-neutral-800 hover:text-white sm:inset-x-0 sm:bottom-4"
            use:melt={$movie_close}>
            <span class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-10" />
            Loka
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<div class="fixed inset-x-0 bottom-8 z-40 w-full sm:hidden">
  <select
    on:change={change}
    id="select cinemas"
    name="select cinemas"
    aria-label="Select cinemas"
    class="mx-auto mt-2 block rounded-md border-0 bg-black bg-opacity-10 py-1.5 pl-3 pr-10 ring-0 ring-inset ring-black backdrop-blur-xl sm:text-sm sm:leading-6">
    {#each [...group_choices, ...all_choices] as [label]}
      <option value={label} id={label} aria-label={label} selected={label === selected_choice}>{label}</option>
    {/each}
  </select>
</div>

<div use:about_portal>
  {#if $about_open}
    <div class="fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm sm:items-center">
      <div
        class="screen-height relative m-4 w-[min(100vw,640px)] overflow-y-auto rounded-2xl bg-neutral-950 p-4 shadow-xl sm:p-8"
        use:melt={$about_overlay}
        transition:flyAndScale={{
          duration: 150,
          y: 8,
          start: 0.96,
        }}>
        <div use:melt={$about_content}>
          <h3 class="mb-2 text-lg font-bold text-neutral-200 md:text-2xl" use:melt={$about_title}>Um okkur 🍿</h3>
          <div class="mb-4 mt-2 text-sm text-neutral-400 [&_a]:underline" use:melt={$about_description}>
            <p class="pb-4">
              Vefsísðan „Hvað er í bíó?“ var upprunarlega unnin af <a
                class="hover:text-neutral-100"
                target="_blank"
                rel="noopener noreferrer"
                href="https://hugihlynsson.com">Huga Hlynssyni</a
              >. Núverandi útgáfa útfærð af
              <a class="hover:text-neutral-100" href="https://twitter.com/olafurbogason" target="_blank" rel="noopener noreferrer"
                >Ólafi Bjarka Bogasyni</a>
              og
              <a class="hover:text-neutral-100" target="_blank" rel="noopener noreferrer" href="https://twitter.com/jokull">Jökli Sólberg</a
              >.
            </p>
            <p class="pb-10">
              Gögn eru fengin af <a class="hover:text-neutral-100" target="_blank" rel="noopener noreferrer" href="https://kvikmyndir.is"
                >kvikmyndir.is</a
              >. Hugbúnaður er aðgengilegur á
              <a class="hover:text-neutral-100" href="https://github.com/multivac61/hvaderibio" target="_blank" rel="noopener noreferrer"
                >GitHub</a>
              þar sem vel er tekið á móti athugasemdum og aðstoð.
            </p>
            <a
              class="mb-4 space-y-4 rounded border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900 px-2.5 py-2 text-base shadow-neutral-800 hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.youtube.com/watch?v=v-u2NMzaduE">
              <span class="inline-flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" class="fill-current">
                  <path d="M3 22V2L21 12L3 22Z" />
                </svg>
                <span class="ml-2 text-sm">Góða skemmtun</span>
              </span>
            </a>
          </div>
        </div>
        <div class="sticky inset-0 bottom-0 isolate z-50 h-20 rounded-b-xl">
          <div class="pointer-events-none absolute -inset-x-4 -bottom-4 z-10 h-24 bg-gradient-to-t from-black sm:-inset-x-8 sm:-bottom-8" />
          <button
            class="absolute inset-x-0 bottom-0 z-20 w-auto rounded-md border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900 px-2.5 py-2 text-base text-neutral-300 shadow-neutral-800 hover:text-white"
            use:melt={$about_close}>Loka</button>
        </div>
      </div>
    </div>
  {/if}
</div>
