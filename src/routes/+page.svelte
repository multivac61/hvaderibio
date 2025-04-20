<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Dialog, Label, Separator } from "bits-ui";
  import { in_range, to_float } from "$lib/util";
  import type { Movie } from "$lib/schemas";

  let { data } = $props();

  const to = $state(24);
  const from = $derived(Math.min(21, new Date().getHours() - 1));

  const all_cinemas = data.movies
    .flatMap((movie: Movie) => Object.keys(movie.cinema_showtimes!))
    .filter((name: string, index: number, array: string[]) => array.indexOf(name) === index)
    .sort();

  const capital_region_cinemas = all_cinemas.filter((name: string) =>
    ["Bíó Paradís", "Háskólabíó", "Laugarásbíó", "Sambíóin Egilshöll", "Sambíóin Kringlunni", "Sambíóin Álfabakka", "Smárabíó"].includes(
      name as string
    )
  );

  const all_choices = all_cinemas.map((name: string) => [name, [name]] as const);

  const group_choices = [
    ["Öll kvikmyndahús", all_cinemas],
    ["Höfuðborgarsvæðið", capital_region_cinemas],
  ] as const;

  let selected_choice: string = $state(group_choices[1][0]);
  let selected_cinemas = $state(capital_region_cinemas);

  const updateSelection = (choiceLabel: string) => {
    selected_choice = choiceLabel;
    selected_cinemas = [...group_choices, ...all_choices].flatMap(([group_label, cinemas]) => (group_label === choiceLabel ? cinemas : []));
  };

  const handleSelectChange = (event: Event & { currentTarget: HTMLSelectElement }) => {
    updateSelection(event.currentTarget.value);
  };

  let filtered_cinemas_showtimes = $derived(
    data.movies.filter(
      (movie: Movie) =>
        Object.keys(movie.cinema_showtimes).some((c) => selected_cinemas.includes(c)) &&
        Object.values(movie.cinema_showtimes).some((times) => times.some(({ time }) => time && in_range(to_float(time), from, to)))
    )
  );

  // --- Body Scroll Lock Logic (with delay) ---
  let activeDialogCount = 0;

  const setBodyScrollLock = (isOpen: boolean) => {
    if (isOpen) {
      activeDialogCount++;
      if (activeDialogCount === 1) {
        requestAnimationFrame(() => {
          if (activeDialogCount > 0) {
            document.body.classList.add("overflow-hidden");
          }
        });
      }
    } else {
      activeDialogCount--;
      if (activeDialogCount === 0) {
        document.body.classList.remove("overflow-hidden");
      }
      if (activeDialogCount < 0) activeDialogCount = 0;
    }
  };

  onDestroy(() => {
    if (activeDialogCount > 0) {
      document.body.classList.remove("overflow-hidden");
      activeDialogCount = 0;
    }
  });
  // --- End Body Scroll Lock Logic ---
</script>

<header class="relative my-4 sm:my-8">
  <div class="hidden sm:block md:mx-auto md:max-w-2xl lg:max-w-3xl">
    <div class="flex flex-wrap justify-center gap-1.5 md:gap-2">
      {#each [...group_choices, ...all_choices] as [label, cinemas]}
        <button
          type="button"
          onclick={() => updateSelection(label)}
          class={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-in-out focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-900 focus:outline-none
            ${
              label === selected_choice
                ? "bg-neutral-800/30 bg-opacity-15 text-white shadow-sm"
                : "bg-neutral-800/60 text-neutral-400 hover:bg-neutral-700/80 hover:text-neutral-200"
            }
          `}>
          {label}
        </button>
      {/each}
    </div>
  </div>

  <div class="fixed inset-x-0 bottom-0 z-40 w-full px-16 pb-4 sm:hidden">
    <div class="relative w-full">
      <select
        onchange={handleSelectChange}
        id="select-cinemas-mobile"
        name="select cinemas mobile"
        aria-label="Veldu kvikmyndahús"
        class="block w-full appearance-none rounded-lg border border-neutral-700/50 bg-neutral-900/80 py-2.5 pr-10 pl-4 text-center text-base text-neutral-100 shadow-lg backdrop-blur-md [text-align-last:center] focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none">
        {#each [...group_choices, ...all_choices] as [label]}
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
  class="md:md-30 z-30 mb-24 grid grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] gap-4 sm:mb-8 sm:grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),2fr))] sm:gap-6">
  {#each filtered_cinemas_showtimes as movie (movie.title)}
    <Dialog.Root onOpenChange={({ next }) => setBodyScrollLock(next)}>
      <Dialog.Trigger>
        <img
          src={`${movie.id}.webp`}
          title={movie.title}
          alt={movie.title}
          class="aspect-[2/3] rounded-lg object-fill shadow-2xl sm:w-[min(100%,360px)] sm:transition-all sm:hover:z-50 sm:hover:scale-105" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity" />
        <Dialog.Content
          class="fixed inset-0 z-50 m-auto flex h-fit max-h-[90vh] w-[min(90vw,640px)] flex-col overflow-hidden rounded-2xl bg-neutral-950 p-4 shadow-xl transition sm:p-8 md:h-auto">
          <Dialog.Title class="mb-2 flex-shrink-0 text-lg font-bold text-neutral-200 md:text-2xl">
            {movie.title}
          </Dialog.Title>

          <div class="min-h-0 flex-grow overflow-y-auto [mask:linear-gradient(black_calc(100%-4rem),transparent)]">
            <Dialog.Description class="text-sm text-neutral-300">
              <p class="mb-4 text-neutral-400">{movie.description}</p>
              <div class="group flex items-center gap-4">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={movie.trailer_url}
                  class="relative flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-300 hover:border-gray-400 hover:text-gray-400">
                  <span
                    class="absolute inset-0 rounded-md opacity-20 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-20"
                  ></span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" class="fill-current">
                    <path d="M3 22V2L21 12L3 22Z" />
                  </svg>
                  Stikla
                </a>
              </div>
              <h2 class="my-6 text-sm text-neutral-400">{data.today}</h2>
              <div>
                <div class="space-y-4">
                  {#each Object.entries(movie.cinema_showtimes) as [cinema, times] (cinema)}
                    {#if selected_cinemas.includes(cinema)}
                      <div>
                        <div class="mb-3 font-medium text-neutral-200">{cinema}</div>
                        <div class="inline-flex flex-wrap gap-3">
                          {#each times as { time, purchase_url } (purchase_url)}
                            {@const showTime = to_float(time)}
                            {#if time && in_range(showTime, from, to)}
                              <a
                                class="group relative rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 px-2.5 py-1 text-base text-neutral-300 tabular-nums hover:bg-neutral-700 hover:text-white"
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
                            {/if}
                          {/each}
                        </div>
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>
            </Dialog.Description>
          </div>

          <div class="sticky -bottom-4 -mx-4 mt-auto h-20 flex-shrink-0 rounded-b-2xl bg-neutral-950 pt-4 sm:-bottom-8 sm:-mx-8">
            <Dialog.Close
              class="group absolute inset-x-4 bottom-4 z-50 flex w-auto items-center justify-center rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 px-2.5 py-2 text-base text-neutral-300 shadow-neutral-800 hover:text-white sm:inset-x-8">
              <span class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-10"
              ></span>
              Loka
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  {/each}
</div>
