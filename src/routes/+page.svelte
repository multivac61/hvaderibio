<script lang="ts">
	import CinemaTab from '$lib/CinemaTab.svelte'
	import Dust from '$lib/Dust.svelte'
	import Movie from '$lib/Movie.svelte'
	import Showtimes from '$lib/Showtimes.svelte'
	import Modal from '$lib/Modal.svelte'
	import { group_by, in_range, to_float } from '$lib/util'

	export let data

	let [from, to] = [Math.min(new Date().getHours(), 22), 24]

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
		;[from, to] = [Math.min(new Date().getHours(), 22), 24]
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
	let about_us = false
</script>

<svelte:window bind:outerWidth={width} bind:outerHeight={height} />
<div class="absolute inset-0 w-full min-h-screen bg-gradient-to-br from-neutral-900 to-black -z-30"></div>

<header class="my-4 sm:my-8 relative">
	<div class="sm:py-4 flex flex-col items-start md:items-center">
		<div class="w-full absolute pointer-events-none overflow-hidden">
			<!-- <Dust {width} {height} /> -->
		</div>
		<h1 class="text-2xl sm:text-5xl z-20 relative">
			<button
				on:click={() => (about_us = !about_us)}
				class="font-black -tracking-[0.03em] uppercase hover:text-yellow-500"
			>
				Hvað er í <span class="text-yellow-500">bíó</span>?
			</button>
		</h1>
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
	class="mb-8 md:md-30 grid gap-4 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),2fr))] sm:grid-cols-[repeat(auto-fill,minmax(min(15rem,100%),2fr))] z-40"
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

<Modal
	open={Boolean(movie)}
	on:click={() => (movie = null)}
	on:close={() => (movie = null)}
	title={movie?.title}
>
	<p class="mb-4 text-neutral-300">{movie?.description}</p>
	<a
		class="mb-4 space-y-4 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
		href={movie?.trailer_url}
	>
		<span class="inline-flex items-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				width="12"
				height="12"
				class="fill-current"
			>
				<path d="M3 22V2L21 12L3 22Z" />
			</svg>
			<span class="ml-2 text-sm">Horfa á stiklu</span>
		</span>
	</a>
	<h2 class="mt-8 mb-2 text-base text-neutral-200 md:text-base">{data.today}</h2>
	<Showtimes showtimes={movie?.showtimes} />
</Modal>

<div class="fixed w-full inset-x-0 sm:hidden bottom-8 z-50">
	<select
		on:change={(event) => {
			selected_choice = event.currentTarget.value
			selected_cinemas = [...group_choices, ...all_choices].flatMap(([group_choice, cinemas]) =>
				group_choice === event.currentTarget.value ? cinemas : []
			)
		}}
		class="mx-auto mt-2 block rounded-md border-0 py-1.5 pl-3 pr-10 bg-black bg-opacity-10 backdrop-blur-xl ring-0 ring-inset ring-black sm:text-sm sm:leading-6"
	>
		{#each [...group_choices, ...all_choices] as [label, cinemas]}
			<option value={label} selected={label === selected_choice}>{label}</option>
		{/each}
	</select>
</div>

<Modal
	open={about_us}
	on:click={() => (about_us = false)}
	on:close={() => (about_us = false)}
	title="Um okkur"
>
	<div class="[&_a]:underline">
		<p class="mb-2">
			Vefsísðan „Hvað er í bíó?“ var upprunarlega unnin af <a
				class="hover:text-neutral-100"
				href="https://hugihlynsson.com">Huga Hlynssyni</a
			>. Núverandi útgáfa útfærð af
			<a class="hover:text-neutral-100" href="https://twitter.com/olafurbogason"
				>Ólafi Bjarka Bogasyni</a
			>
			og
			<a class="hover:text-neutral-100" href="https://twitter.com/jokull">Jökli Sólberg</a>.
		</p>
		<p class="pb-4">
			Gögn eru fengin af <a class="hover:text-neutral-100" href="https://kvikmyndir.is"
				>kvikmyndir.is</a
			>. Hugbúnaður er aðgengilegur á
			<a class="hover:text-neutral-100" href="https://github.com/multivac61/hvaderibio">GitHub</a>
			þar sem vel er tekið á móti athugasemdum og aðstoð.
		</p>
	<a
		class="mb-4 space-y-4 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
		href="https://www.youtube.com/watch?v=v-u2NMzaduE"
	>
		<span class="inline-flex items-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				width="12"
				height="12"
				class="fill-current"
			>
				<path d="M3 22V2L21 12L3 22Z" />
			</svg>
			<span class="ml-2 text-sm">Góða skemmtun</span>
		</span>
	</a>
	</div>
</Modal>
