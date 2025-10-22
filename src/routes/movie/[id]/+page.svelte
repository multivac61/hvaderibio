<script lang="ts">
  import { page } from "$app/state";
  import { in_range, to_float } from "$lib/util";

  let { data } = $props();

  const movieId = $derived(Number(page.params.id));
  const movie = $derived(data.movies.find((m) => m.id === movieId));

  // Fade-in animation on mount
  let isVisible = $state(false);
  $effect(() => {
    // Trigger fade-in after a small delay for smooth transition
    const timeout = setTimeout(() => {
      isVisible = true;
    }, 50);
    return () => clearTimeout(timeout);
  });

  const to = 24;
  const from = Math.min(21, new Date().getHours());

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

  // Get the stored cinema selection from sessionStorage
  const savedChoice = typeof window !== "undefined" ? sessionStorage.getItem("selectedCinemaChoice") : null;

  const selected_cinemas = $derived(
    savedChoice
      ? [...group_choices, ...all_choices].find(([label]) => label === savedChoice)?.[1] || capital_region_cinemas
      : capital_region_cinemas
  );

  const goBack = () => {
    window.history.back();
  };
</script>

{#if movie}
  <div class="fixed inset-0 flex flex-col bg-black text-neutral-100 transition-opacity duration-500 ease-out" class:opacity-0={!isVisible} class:opacity-100={isVisible}>
    <div class="container mx-auto flex h-full max-w-5xl flex-col overflow-y-auto px-4 py-8">
      <div class="w-full">
        <button
          onclick={goBack}
          class="mb-6 inline-flex items-center gap-2 rounded-md bg-neutral-800/60 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700/80 hover:text-neutral-200">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Til baka
        </button>

        <div class="grid gap-8 md:grid-cols-2 lg:gap-12">
          <div>
            <img src={`/${movie.id}.webp`} title={movie.title} alt={movie.title} loading="eager" decoding="async" class="w-full max-w-md rounded-lg shadow-2xl" />
          </div>

          <div>
            <h1 class="mb-4 text-3xl font-bold text-neutral-200 md:text-4xl">
              {movie.title}
            </h1>

            <p class="mb-6 text-neutral-400">{movie.description}</p>

            <div class="mb-8">
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={movie.trailer_url}
                class="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-gray-400 hover:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" class="fill-current">
                  <path d="M3 22V2L21 12L3 22Z" />
                </svg>
                Horfa á stiklu
              </a>
            </div>

            <div class="space-y-6">
              {#each Object.entries(movie.cinema_showtimes) as [cinema, times] (cinema)}
                {#if selected_cinemas.includes(cinema)}
                  {@const validTimes = times.filter(({ time }) => time && in_range(to_float(time), from, to))}
                  {#if validTimes.length > 0}
                    <div>
                      <div class="mb-3 text-lg">{cinema}</div>
                      <div class="inline-flex flex-wrap gap-3">
                        {#each validTimes as { time, purchase_url } (purchase_url)}
                          <a
                            class="group relative rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 px-3 py-2 text-base text-neutral-300 tabular-nums transition-colors hover:bg-neutral-700 hover:text-white"
                            href={purchase_url}
                            target="_blank"
                            rel="noopener noreferrer">
                            <span
                              class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-10"
                            ></span>
                            {new Date(time).toLocaleTimeString("is-IS", {
                              timeStyle: "short",
                              hour12: false,
                            })}
                          </a>
                        {/each}
                      </div>
                    </div>
                  {/if}
                {/if}
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="flex min-h-screen items-center justify-center bg-black text-neutral-100">
    <div class="text-center">
      <h1 class="mb-4 text-2xl font-bold">Mynd fannst ekki</h1>
      <button
        onclick={goBack}
        class="inline-flex items-center gap-2 rounded-md bg-neutral-800/60 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700/80 hover:text-neutral-200">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Til baka á forsíðu
      </button>
    </div>
  </div>
{/if}
