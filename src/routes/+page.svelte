<script lang="ts">
  import { count_movie_showtimes, get_showtime_window, HYDRATION_SAFE_SHOWTIME_WINDOW } from "$lib/showtimes";
  import { DEFAULT_CINEMA_CHOICE, get_cinemas_for_choice, cinemaState } from "$lib/cinema-state.svelte";
  import { dayState } from "$lib/day-state.svelte";
  import CinemaSelect from "$lib/CinemaSelect.svelte";
  import CinemaTabs from "$lib/CinemaTabs.svelte";
  import DayPicker from "$lib/DayPicker.svelte";
  import MoviePosterCard from "$lib/MoviePosterCard.svelte";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";

  const { data } = $props();
  const movies = $derived(data.movies);
  const cinema_options = $derived(data.cinema_options);

  // Keep the prerendered and initial client-side order identical. Reordering
  // during hydration can leave Safari's poster image attached to another link.
  let showtime_window: { from: number; to: number } = $state(HYDRATION_SAFE_SHOWTIME_WINDOW);

  onMount(() => {
    showtime_window = get_showtime_window();
  });

  // Read cinema and day from shared state
  const selected_choice = $derived(cinemaState.value ?? DEFAULT_CINEMA_CHOICE);
  const selected_cinemas = $derived(get_cinemas_for_choice(selected_choice, cinema_options));
  const selected_day = $derived(dayState.value ?? "0");

  const updateCinema = (choiceLabel: string) => {
    cinemaState.set(choiceLabel);
  };

  const updateDay = (day: string) => {
    dayState.set(day);
  };

  const filtered_cinemas_showtimes = $derived.by(() =>
    movies
      .filter((movie) => count_movie_showtimes(movie, selected_day, selected_cinemas, showtime_window.from, showtime_window.to) > 0)
      .sort(
        (a, b) =>
          count_movie_showtimes(b, selected_day, selected_cinemas, showtime_window.from, showtime_window.to) -
          count_movie_showtimes(a, selected_day, selected_cinemas, showtime_window.from, showtime_window.to)
      )
  );
</script>

<svelte:head>
  <title>Hvað er í bíó? - Bíódagskrá kvöldsins</title>
  <meta name="description" content="Fljótlegt yfirlit yfir bíódagskrá kvöldsins á öllu landinu. Skoðaðu sýningartíma og bókaðu miða." />
</svelte:head>

<header class="relative hidden sm:mt-8 sm:mb-5 sm:block">
  <h1 class="mb-3 text-center text-5xl tracking-tight text-pretty text-white" style="font-family: 'Space Grotesk', sans-serif;">
    Hvað er í bíó?
  </h1>
  <div class="mx-auto sm:block md:max-w-none">
    <!-- Cinema selection -->
    <CinemaTabs cinemaOptions={cinema_options} selectedChoice={selected_choice} onSelect={updateCinema} />
    <!-- Day selection -->
    <div class="flex justify-center">
      <DayPicker selectedDay={selected_day} onSelect={updateDay} />
    </div>
  </div>
</header>

<div class="relative">
  <div in:fade={{ duration: 220 }} class="sticky top-[calc(100dvh-5.5rem)] z-40 h-0 sm:hidden">
    <div class="flex w-full justify-center px-4 pb-3">
      <div class="flex flex-col items-center gap-2">
        <!-- Cinema dropdown -->
        <div class="flex justify-center">
          <CinemaSelect cinemaOptions={cinema_options} selectedChoice={selected_choice} onSelect={updateCinema} />
        </div>
        <!-- Day pills -->
        <div class="flex justify-center">
          <DayPicker selectedDay={selected_day} onSelect={updateDay} size="sm" />
        </div>
      </div>
    </div>
  </div>

  {#key `${selected_day}-${selected_choice}`}
    {#if filtered_cinemas_showtimes.length === 0}
      <div in:fade={{ duration: 180 }} class="flex flex-col items-center justify-center py-16 text-center">
        <p class="text-lg text-neutral-400">Engar sýningar fundust</p>
        <p class="mt-1 text-sm text-neutral-500">Prófaðu að velja annan dag eða kvikmyndahús</p>
      </div>
    {:else}
      <div
        class="md:md-30 -mx-1 grid grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] gap-4 sm:mx-0 sm:mb-8 sm:grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),2fr))] sm:gap-6 sm:pt-2">
        {#each filtered_cinemas_showtimes as movie, index (movie.id)}
          <MoviePosterCard {movie} {index} />
        {/each}
      </div>
    {/if}
  {/key}
</div>
