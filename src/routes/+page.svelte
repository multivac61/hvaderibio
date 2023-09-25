<script lang="ts">
  import "../app.postcss";

  import CinemaTab from "$lib/CinemaTab.svelte";
  import Dust from "$lib/Dust.svelte";
  import { group_by, in_range, to_float, flyAndScale } from "$lib/util";
  import { onMount } from "svelte";

  import { createDialog, melt } from "@melt-ui/svelte";
  import type { Movie, Showtime } from "$lib/schemas";
  import Showtimes from "$lib/Showtimes.svelte";
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

  let selected_movie: (typeof filtered_cinemas_showtimes)[0] | undefined;

  const all_cinemas: string[] = data.movies
    .flatMap((movie: Movie) => movie.showtimes.flatMap((showtime: Showtime) => showtime.cinema))
    .filter((name: string, index: number, array: string[]) => array.indexOf(name) === index)
    .sort();

  $: filtered_cinemas_showtimes = data.movies
    .sort((a: Movie, b: Movie) => b.showtimes.length - a.showtimes.length)
    .filter((movie: Movie) =>
      movie.showtimes.some((showtime) => selected_cinemas.includes(showtime.cinema) && in_range(to_float(showtime.time), from, to))
    )
    .map((movie: Movie) => ({
      ...movie,
      showtimes: Object.entries(
        group_by(
          movie.showtimes.filter((showtime) => selected_cinemas.includes(showtime.cinema) && in_range(to_float(showtime.time), from, to)),
          "cinema"
        )
      ),
    }));

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

<header class="my-4 sm:my-8 relative">
  <div class="sm:py-4 flex flex-col items-start md:items-center">
    <div class="w-full absolute pointer-events-none overflow-hidden">
      <Dust {width} {height} />
    </div>
    <h1>
      <button use:melt={$about_trigger} class="font-black text-4xl sm:text-6xl uppercase hover:text-yellow-500">
        Hvað er í <span class="bg-gradient-to-br from-yellow-500 to-red-500 bg-clip-text text-transparent box-decoration-clone">bíó</span>?
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
  class="mb-8 md:md-30 grid gap-4 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] sm:grid-cols-[repeat(auto-fill,minmax(min(15rem,100%),2fr))] z-40">
  {#each filtered_cinemas_showtimes as movie (movie.title)}
    <button on:click={() => (selected_movie = movie)} use:melt={$movie_trigger}>
      <img
        src={`posters/${movie.images[0].path}`}
        title={movie.title}
        alt={movie.title}
        class="object-fill aspect-[2/3] rounded-lg shadow-2xl sm:w-[min(100%,360px)] sm:hover:scale-105 sm:hover:z-50 sm:transition-all" />
    </button>
  {/each}
</div>

{#if $movie_open}
  <div class="fixed inset-0 z-50 backdrop-blur-sm flex justify-center items-end sm:items-center transition-opacity" use:movie_portal>
    <div
      class="relative rounded-2xl bg-neutral-950 m-6 shadow-xl screen-height w-[min(100vw,640px)] overflow-y-auto p-4 sm:p-8 transition-opacity"
      use:melt={$movie_overlay}>
      <div use:melt={$movie_content}>
        <h3 class="font-bold mb-2 text-lg md:text-2xl text-neutral-200" use:melt={$movie_title}>{selected_movie.title}</h3>
        <div class="mt-2 text-sm mb-4 text-neutral-300" use:melt={$movie_description}>
          <p class="mb-4 text-neutral-400">{selected_movie.description}</p>
          <div class="flex group gap-4 items-center">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={selected_movie.trailer_url}
              class="relative py-1 px-3 border border-gray-300 text-gray-300 text-sm font-medium rounded-md flex gap-2 items-center hover:border-gray-400 hover:text-gray-400">
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
                  class="relative py-1 px-3 border border-[#f6c700] text-[#f6c700] text-sm font-medium rounded-md hover:border-yellow-200 hover:text-yellow-200">
                  <span
                    class="absolute inset-0 rounded-md opacity-20 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-20" />
                  IMDb · {selected_movie.imdb.star}</a>
              </div>
            {/if}
          </div>
          <h2 class="my-6 text-neutral-400 text-sm">{data.today}</h2>
          <Showtimes showtimes={selected_movie.showtimes} />
        </div>
        <div class="sticky inset-0 bottom-0 rounded-b-xl z-50 isolate h-20">
          <div class="absolute -inset-x-4 -bottom-4 sm:-bottom-8 sm:-inset-x-8 h-24 bg-gradient-to-t from-black z-10 pointer-events-none" />
          <button
            class="absolute group w-auto bottom-0 inset-x-0 sm:bottom-4 sm:inset-x-0 z-50 text-neutral-300 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900"
            use:melt={$movie_close}>
            <span class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-10" />
            Loka
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<div class="fixed w-full inset-x-0 sm:hidden bottom-8 z-40">
  <select
    on:change={change}
    class="mx-auto mt-2 block rounded-md border-0 py-1.5 pl-3 pr-10 bg-black bg-opacity-10 backdrop-blur-xl ring-0 ring-inset ring-black sm:text-sm sm:leading-6">
    {#each [...group_choices, ...all_choices] as [label]}
      <option value={label} selected={label === selected_choice}>{label}</option>
    {/each}
  </select>
</div>

<div use:about_portal>
  {#if $about_open}
    <div class="fixed inset-0 z-50 backdrop-blur-sm flex justify-center items-end sm:items-center">
      <div
        class="relative rounded-2xl bg-neutral-950 m-4 shadow-xl screen-height w-[min(100vw,640px)] overflow-y-auto p-4 sm:p-8"
        use:melt={$about_overlay}
        transition:flyAndScale={{
          duration: 150,
          y: 8,
          start: 0.96,
        }}>
        <div use:melt={$about_content}>
          <h3 class="font-bold mb-2 text-lg md:text-2xl text-neutral-200" use:melt={$about_title}>Um okkur 🍿</h3>
          <div class="[&_a]:underline mt-2 text-sm mb-4 text-neutral-400" use:melt={$about_description}>
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
              class="mb-4 space-y-4 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
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
        <div class="sticky inset-0 bottom-0 rounded-b-xl z-50 isolate h-20">
          <div class="absolute -inset-x-4 -bottom-4 sm:-bottom-8 sm:-inset-x-8 h-24 bg-gradient-to-t from-black z-10 pointer-events-none" />
          <button
            class="absolute w-auto bottom-0 inset-x-0 z-20 text-neutral-300 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded-md border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
            use:melt={$about_close}>Loka</button>
        </div>
      </div>
    </div>
  {/if}
</div>
