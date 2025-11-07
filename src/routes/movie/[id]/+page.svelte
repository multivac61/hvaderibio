<script lang="ts">
  import { in_range, to_float } from "$lib/util";

  let { data } = $props();
  const movie = data.movie;

  const to = 24;
  const from = Math.min(21, new Date().getHours());

  const all_cinemas = Object.keys(movie.cinema_showtimes).sort();

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
</script>

<!-- Background glow effect with top/bottom mask -->
<div
  class="pointer-events-none fixed inset-0 opacity-20"
  style="background-image: url('/{movie.id}.webp'); background-size: cover; background-position: center; filter: blur(80px) saturate(1.5); transform: scale(1.2); mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);">
</div>

<div class="relative z-10 container mx-auto flex h-full max-w-7xl flex-col justify-start overflow-y-auto px-4 py-8 md:py-16">
  <div class="w-full">
    <div class="grid gap-8 md:grid-cols-2 lg:gap-16 xl:gap-20">
      <div class="flex justify-center md:justify-end">
        <img
          src={`/${movie.id}.webp`}
          title={movie.title}
          alt={movie.title}
          loading="eager"
          decoding="async"
          width="720"
          height="1080"
          class="w-full max-w-md rounded-lg bg-neutral-900 shadow-2xl xl:max-w-lg" />
      </div>

      <div class="flex flex-col">
        <h1 class="mb-4 text-3xl font-bold text-neutral-200 md:text-4xl xl:text-5xl">
          {movie.title}
        </h1>

        <p class="mb-6 text-base leading-relaxed text-neutral-400 md:text-lg">{movie.description}</p>

        <div class="mb-8">
          <!-- eslint-disable svelte/no-navigation-without-resolve -->
          <a
            target="_blank"
            rel="external noopener noreferrer"
            href={movie.trailer_url}
            class="group relative inline-flex items-center gap-2 rounded-md bg-linear-to-br from-neutral-800 to-neutral-900 px-4 py-2 text-base text-neutral-300 transition-all duration-200 ease-out hover:bg-neutral-700 hover:text-white">
            <span
              class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity duration-200 group-hover:opacity-10"
            ></span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" class="relative fill-current">
              <path d="M3 22V2L21 12L3 22Z" />
            </svg>
            <span class="relative">Stikla</span>
          </a>
        </div>

        <div class="space-y-6 xl:space-y-8">
          {#each Object.entries(movie.cinema_showtimes) as [cinema, times] (cinema)}
            {#if selected_cinemas.includes(cinema)}
              {@const validTimes = times.filter(({ time }) => time && in_range(to_float(time), from, to))}
              {#if validTimes.length > 0}
                <div>
                  <div class="mb-3 text-lg font-medium xl:text-xl">{cinema}</div>
                  <div class="inline-flex flex-wrap gap-3 xl:gap-4">
                    {#each validTimes as { time, purchase_url } (purchase_url)}
                      <!-- eslint-disable svelte/no-navigation-without-resolve -->
                      <a
                        class="group relative rounded-md bg-linear-to-br from-neutral-800 to-neutral-900 px-3 py-2 text-base text-neutral-300 tabular-nums transition-all duration-200 ease-out hover:bg-neutral-700 hover:text-white xl:px-4 xl:py-2.5 xl:text-lg"
                        href={purchase_url}
                        target="_blank"
                        rel="external noopener noreferrer">
                        <span
                          class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity duration-200 group-hover:opacity-10"
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
