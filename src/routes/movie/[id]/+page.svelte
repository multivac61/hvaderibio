<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { in_range, to_float } from "$lib/util";
  import type { Movie } from "$lib/schemas";

  let { data } = $props();
  
  const movieId = Number($page.params.id);
  const movie = $derived(data.movies.find((m: Movie) => m.id === movieId));
  
  const to = 24;
  const from = Math.min(21, new Date().getHours());
  
  const all_cinemas = data.movies
    .flatMap((movie: Movie) => Object.keys(movie.cinema_showtimes!))
    .filter((name: string, index: number, array: string[]) => array.indexOf(name) === index)
    .sort();

  const capital_region_cinemas = all_cinemas.filter((name: string) =>
    ["Bíó Paradís", "Háskólabíó", "Laugarásbíó", "Sambíóin Egilshöll", "Sambíóin Kringlunni", "Sambíóin Álfabakka", "Smárabíó"].includes(
      name as string
    )
  );
  
  // Default to capital region cinemas for movie detail view
  const selected_cinemas = capital_region_cinemas;
  
  const handleBack = () => {
    window.history.back();
  };
</script>

{#if movie}
  <div class="min-h-screen bg-black text-neutral-100 flex flex-col">
    <div class="container mx-auto px-4 max-w-5xl flex-1 flex items-start md:items-center py-8">
      <div class="w-full md:transform md:-translate-y-1/3">
        <button
          onclick={handleBack}
          class="mb-6 inline-flex items-center gap-2 rounded-md bg-neutral-800/60 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700/80 hover:text-neutral-200 transition-colors">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Til baka
        </button>
        
        <div class="grid gap-8 md:grid-cols-[300px_1fr] lg:grid-cols-[360px_1fr] xl:grid-cols-[420px_1fr]">
          <div>
            <img
              src={`${base}/${movie.id}.webp`}
              title={movie.title}
              alt={movie.title}
              class="w-full max-w-sm lg:max-w-md xl:max-w-lg mx-auto rounded-lg shadow-2xl" />
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
              class="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-300 hover:border-gray-400 hover:text-gray-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" class="fill-current">
                <path d="M3 22V2L21 12L3 22Z" />
              </svg>
              Horfa á stiklu
            </a>
          </div>
          
          <div class="space-y-6">
            {#each Object.entries(movie.cinema_showtimes) as [cinema, times] (cinema)}
              {@const typedTimes = times as any[]}
              {#if selected_cinemas.includes(cinema)}
                {@const validTimes = typedTimes.filter(({ time }: any) => time && in_range(to_float(time), from, to))}
                {#if validTimes.length > 0}
                  <div>
                    <div class="mb-3 text-lg">{cinema}</div>
                    <div class="inline-flex flex-wrap gap-3">
                      {#each validTimes as { time, purchase_url } (purchase_url)}
                        <a
                          class="group relative rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 px-3 py-2 text-base text-neutral-300 tabular-nums hover:bg-neutral-700 hover:text-white transition-colors"
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
  <div class="min-h-screen flex items-center justify-center bg-black text-neutral-100">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Mynd fannst ekki</h1>
      <button
        onclick={handleBack}
        class="inline-flex items-center gap-2 rounded-md bg-neutral-800/60 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700/80 hover:text-neutral-200 transition-colors">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Til baka á forsíðu
      </button>
    </div>
  </div>
{/if}
