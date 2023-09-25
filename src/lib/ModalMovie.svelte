<script lang="ts">
  import Showtimes from "$lib/Showtimes.svelte";
  import type { Movie, Showtime } from "$lib/schemas";

  export let selected_movie: Omit<Movie, "showtimes"> & { showtimes: [string, Showtime[]][] };

  export let movie_dialog;
  export let today: string;
  let { portal, open, close, overlay, content, title, description } = movie_dialog;
</script>

{#if $open}
  <div class="fixed inset-0 z-50 backdrop-blur-sm flex justify-center items-end sm:items-center transition-opacity" use:portal>
    <div
      class="relative rounded-2xl bg-neutral-950 m-6 shadow-xl screen-height w-[min(100vw,640px)] overflow-y-auto p-4 sm:p-8 transition-opacity"
      melt={$overlay}>
      <div melt={$content}>
        <h3 class="font-bold mb-2 text-lg md:text-2xl text-neutral-200" melt={$title}>{selected_movie.title}</h3>
        <div class="mt-2 text-sm mb-4 text-neutral-300" melt={$description}>
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
          <h2 class="my-6 text-neutral-400 text-sm">{today}</h2>
          <Showtimes showtimes={selected_movie.showtimes} />
        </div>
        <div class="sticky inset-0 bottom-0 rounded-b-xl z-50 isolate h-20">
          <div class="absolute -inset-x-4 -bottom-4 sm:-bottom-8 sm:-inset-x-8 h-24 bg-gradient-to-t from-black z-10 pointer-events-none" />
          <button
            class="absolute group w-auto bottom-0 inset-x-0 sm:bottom-4 sm:inset-x-0 z-50 text-neutral-300 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900"
            melt={$close}>
            <span class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-10" />
            Loka
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
