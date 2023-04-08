<script lang="ts">
	import CinemaTab from '$lib/CinemaTab.svelte'
	import Dust from '$lib/Dust.svelte'
	import Movie from '$lib/Movie.svelte'
	import Showtimes from '$lib/Showtimes.svelte'
	import { group_by, in_range, to_float } from '$lib/util'
	import {
		Dialog,
		DialogDescription,
		DialogOverlay,
		DialogTitle
	} from '@rgossiaux/svelte-headlessui'
	import { fade } from 'svelte/transition'

	export let data

	let [from, to] = [12, 23.5]

	let movie: (typeof filtered_cinemas_showtimes)[0] | null = null

	const all_cinemas = [
		...new Set(
			data.movies.flatMap((movie) => movie.showtimes.flatMap((showtime) => showtime.cinema))
		)
	].sort()

	let selected_cinemas = all_cinemas

	$: filtered_cinemas_showtimes = data.movies
		.sort((a, b) => b.showtimes.length - a.showtimes.length)
		.filter((movie) =>
			movie.showtimes.some(
				(showtime) =>
					selected_cinemas.includes(showtime.cinema) && in_range(to_float(showtime.time), from, to)
			)
		)
		.map((movie) => ({
			...movie,
			showtimes: Object.entries(
				group_by(
					movie.showtimes.filter(
						(showtime) =>
							selected_cinemas.includes(showtime.cinema) &&
							in_range(to_float(showtime.time), from, to)
					),
					'cinema'
				)
			)
		}))

	function reset() {
		;[from, to] = [12, 23.5]
		selected_cinemas = all_cinemas
	}
	let width: number
	let height: number

	let capital_region_cinemas = all_cinemas.filter((name) =>
		[
			'Bíó Paradís',
			'Háskólabíó',
			'Laugarásbíó',
			'Sambíóin Egilshöll',
			'Sambíóin Kringlunni',
			'Sambíóin Álfabakka',
			'Smárabíó'
		].includes(name)
	)

	let all_choices = all_cinemas.map((name) => [name, [name]] as const)

	let group_choices = [
		['Öll kvikmyndahús', all_cinemas],
		['Höfuðborgarsvæðið', capital_region_cinemas]
	] as const

	let selected_choice: string = group_choices[0][0]
</script>

<svelte:window bind:outerWidth={width} bind:outerHeight={height} />

<header class="my-4 sm:my-8 relative">
	<div class="sm:py-8 flex flex-col items-start md:items-center">
		<div class="w-full absolute pointer-events-none overflow-hidden">
			<Dust {width} {height} />
		</div>
		<h1 class="text-2xl sm:text-5xl z-20 relative">
			<span class="font-black -tracking-[0.03em] uppercase">
				Hvað er í <span class="text-yellow-500">bíó</span>?
			</span>
		</h1>
		<h2 class="z-20 md:text-l md:mt-4 text-gray-300">
			{data.today}
		</h2>
	</div>
	<div class="mb-4 hidden sm:block md:mx-auto md:max-w-xl">
		<div class="inline-flex flex-wrap gap-0.5 md:justify-center">
			{#each [...group_choices, ...all_choices] as [label, cinemas]}
				<CinemaTab
					{label}
					is_selected={label === selected_choice}
					on_click={() => {
						selected_choice = label
						selected_cinemas = Array.from(cinemas)
					}}
				/>
			{/each}
		</div>
	</div>
</header>

<div
	class="my-8 md:md-30 grid gap-4 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] sm:grid-cols-[repeat(auto-fill,minmax(min(15rem,100%),2fr))] z-40"
>
	{#each filtered_cinemas_showtimes as _movie (_movie.title)}
		<Movie
			movie={_movie}
			on_click={() => {
				movie = _movie
			}}
		/>
	{/each}
</div>

{#if filtered_cinemas_showtimes.length == 0}
	<p>
		Engin mynd uppfyllir skilyrðin. <button on:click={reset}>Prófaðu að víkka þau.</button>
	</p>
{/if}

<div class="mt-8 mb-20">
	<footer class="[&_a]:underline text-neutral-400 [&_a]:text-neutral-300">
		<p>
			„Hvað er í bíó?“ upprunarlega unnin af <a href="https://hugihlynsson.com">Huga Hlynssyni</a>.
			Núverandi útgáfa útfærð af
			<a href="https://twitter.com/olafurbogason">Ólafi Bjarka Bogasyni</a>.
		</p>
		<p>
			Gögn eru fengin af <a href="https://kvikmyndir.is">kvikmyndir.is</a>. Hugbúnaður er
			aðgengilegur á <a href="https://github.com/multivac61/hvaderibio">GitHub</a> þar sem vel er
			tekið á móti athugasemdum og aðstoð.
			<a href="https://www.youtube.com/watch?v=v-u2NMzaduE">Góða skemmtun!</a>
		</p>
	</footer>

	{#if movie}
		<div transition:fade>
			<Dialog
				open={Boolean(movie)}
				on:close={() => (movie = null)}
				class="fixed inset-0 z-50 isolate sm:flex sm:justify-center sm:items-center"
			>
				<DialogOverlay class="fixed inset-0 bg-black/60" />

				<div
					class="relative rounded-2xl overflow-hidden bg-neutral-950 h-[calc(100dvh-32px)] sm:h-[calc(100dvh-120px)] sm:w-[min(100vw,640px)] m-4 z-10 border border-neutral-600 shadow-xl"
				>
					<div class="absolute inset-0 overflow-y-auto p-4 sm:p-8 pb-20 sm:pb-24 z-20">
						<DialogTitle class="font-bold mb-2 text-lg md:text-2xl">{movie.title}</DialogTitle>
						<DialogDescription class="text-sm mb-4">
							{movie.description} —
							<a class="underline" href={movie.trailer_url} target="_blank"> Trailer. </a>
						</DialogDescription>
						<Showtimes showtimes={movie.showtimes} />
					</div>
					<div class="absolute bottom-0 inset-x-0 z-30 px-4">
						<div
							class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black z-40 pointer-events-none"
						/>
						<button
							class="absolute bottom-4 inset-x-4 sm:bottom-8 sm:inset-x-8 z-50 rounded-md bg-neutral-800 text-white py-2 font-medium border border-neutral-600 shadow-xl"
							on:click={() => (movie = null)}>Loka</button
						>
					</div>
				</div>
			</Dialog>
		</div>
	{:else}
		<div class="fixed w-full inset-x-0 sm:hidden bottom-8 z-50">
			<select
				on:change={(event) => {
					selected_choice = event.currentTarget.value
					selected_cinemas = [...group_choices, ...all_choices].flatMap(([group_choice, cinemas]) =>
						group_choice === event.currentTarget.value ? cinemas : []
					)
				}}
				class="mx-auto mt-2 block rounded-lg border-0 py-1.5 pl-3 pr-10 bg-black bg-opacity-10 backdrop-blur-xl ring-0 ring-inset ring-black sm:text-sm sm:leading-6"
			>
				{#each [...group_choices, ...all_choices] as [label, cinemas]}
					<option value={label} selected={label === selected_choice}>{label}</option>
				{/each}
			</select>
		</div>
	{/if}
</div>
