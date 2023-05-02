<script lang="ts">
	import { browser } from '$app/environment'
	import CinemaTab from '$lib/CinemaTab.svelte'
	import Dust from '$lib/Dust.svelte'
	import ModalMovie from '$lib/ModalMovie.svelte'
	import Movie from '$lib/Movie.svelte'
	import { group_by, in_range, to_float } from '$lib/util'
	import { onMount } from 'svelte'
	import { createDialog } from 'svelte-headlessui'
	import { lock, unlock } from 'tua-body-scroll-lock'

	export let data

	let [from, to] = [Math.min(new Date().getHours(), 22), 24]

	onMount(() => {
		// Filter showtime again on the client
		from = Math.min(21, new Date().getHours() - 1)
	})

	let movie: (typeof filtered_cinemas_showtimes)[0] | null = null

	const all_cinemas = [
		...new Set(
			data.movies.flatMap((movie) => movie.showtimes.flatMap((showtime) => showtime.cinema))
		)
	].sort()

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

	let selected_choice: string = group_choices[1][0]
	let selected_cinemas = capital_region_cinemas

	let movie_dialog = createDialog({ label: 'Movie dialog' })
	let about_dialog = createDialog({ label: 'Um okkur' })

	$: if (browser)
		document.documentElement.classList.toggle(
			'noscroll',
			$movie_dialog.expanded || $about_dialog.expanded
		)
	let movie_dialog_scroll: HTMLElement
	$: if (browser && movie_dialog_scroll) {
		if ($movie_dialog.expanded) {
			lock(movie_dialog_scroll)
		} else {
			unlock(movie_dialog_scroll)
		}
	}

	let about_dialog_scroll: HTMLElement
	$: if (browser && about_dialog_scroll) {
		if ($about_dialog.expanded) {
			lock(about_dialog_scroll)
		} else {
			unlock(about_dialog_scroll)
		}
	}

	let width: number
	let height: number
</script>

<svelte:window bind:outerWidth={width} bind:outerHeight={height} />

<header class="my-4 sm:my-8 relative">
	<div class="sm:py-4 flex flex-col items-start md:items-center">
		<div class="w-full absolute pointer-events-none overflow-hidden">
			<Dust {width} {height} />
		</div>
		<h1>
			<button
				on:click|preventDefault={about_dialog.open}
				on:touchstart|preventDefault={about_dialog.open}
				class="font-black text-4xl sm:text-6xl uppercase hover:text-yellow-500"
			>
				Hvað er í <span
					class="bg-gradient-to-br from-yellow-500 to-red-500 bg-clip-text text-transparent box-decoration-clone"
					>bíó</span
				>?
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
			on:click={() => {
				movie = _movie
				movie_dialog.open()
			}}
		/>
	{/each}
</div>

{#if $movie_dialog.expanded}
	<div
		class="fixed inset-0 z-50 backdrop-blur-sm flex justify-center items-end sm:items-center transition-opacity"
	>
		<div
			class="relative rounded-2xl bg-neutral-950 m-6 shadow-xl screen-height w-[max(100vw,640px)] overflow-y-auto p-4 sm:p-8 transition-opacity"
			bind:this={movie_dialog_scroll}
		>
			<div use:movie_dialog.modal>
				{#if movie}
					<ModalMovie {movie} today={data.today} />
				{/if}
				<div class="sticky inset-0 bottom-0 rounded-b-xl z-50 isolate h-20">
					<div
						class="absolute -inset-x-4 -bottom-4 sm:-bottom-8 sm:-inset-x-8 h-24 bg-gradient-to-t from-black z-10 pointer-events-none"
					/>
					<button
						class="absolute group w-auto bottom-0 inset-x-0 sm:bottom-4 sm:inset-x-0 z-50 text-neutral-300 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900"
						on:click|preventDefault={movie_dialog.close}
						on:touchstart|preventDefault={movie_dialog.close}
					>
						<span
							class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-10"
						/>
						Loka
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class="fixed w-full inset-x-0 sm:hidden bottom-8 z-40">
	<select
		on:change={(event) => {
			selected_choice = event.currentTarget.value
			selected_cinemas = [...group_choices, ...all_choices].flatMap(([group_choice, cinemas]) =>
				group_choice === event.currentTarget.value ? cinemas : []
			)
		}}
		class="mx-auto mt-2 block rounded-md border-0 py-1.5 pl-3 pr-10 bg-black bg-opacity-10 backdrop-blur-xl ring-0 ring-inset ring-black sm:text-sm sm:leading-6"
	>
		{#each [...group_choices, ...all_choices] as [label]}
			<option value={label} selected={label === selected_choice}>{label}</option>
		{/each}
	</select>
</div>

{#if $about_dialog.expanded}
	<div class="fixed inset-0 z-50 backdrop-blur-sm flex justify-center items-end sm:items-center">
		<div
			class="relative rounded-2xl bg-neutral-950 m-4 shadow-xl screen-height w-[min(100vw,640px)] overflow-y-auto p-4 sm:p-8"
			bind:this={about_dialog_scroll}
		>
			<div use:about_dialog.modal>
				<h3 class="font-bold mb-2 text-lg md:text-2xl text-neutral-200">Um okkur 🍿</h3>
				<div class="[&_a]:underline">
					<p class="pb-8">
						Vefsísðan „Hvað er í bíó?“ var upprunarlega unnin af <a
							class="hover:text-neutral-100"
							target="_blank"
							rel="noopener noreferrer"
							href="https://hugihlynsson.com">Huga Hlynssyni</a
						>. Núverandi útgáfa útfærð af
						<a
							class="hover:text-neutral-100"
							href="https://twitter.com/olafurbogason"
							target="_blank"
							rel="noopener noreferrer">Ólafi Bjarka Bogasyni</a
						>
						og
						<a
							class="hover:text-neutral-100"
							target="_blank"
							rel="noopener noreferrer"
							href="https://twitter.com/jokull">Jökli Sólberg</a
						>.
					</p>
					<p class="pb-10">
						Gögn eru fengin af <a
							class="hover:text-neutral-100"
							target="_blank"
							rel="noopener noreferrer"
							href="https://kvikmyndir.is">kvikmyndir.is</a
						>. Hugbúnaður er aðgengilegur á
						<a
							class="hover:text-neutral-100"
							href="https://github.com/multivac61/hvaderibio"
							target="_blank"
							rel="noopener noreferrer">GitHub</a
						>
						þar sem vel er tekið á móti athugasemdum og aðstoð.
					</p>
					<a
						class="mb-4 space-y-4 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
						target="_blank"
						rel="noopener noreferrer"
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
			</div>
			<div class="sticky inset-0 bottom-0 rounded-b-xl z-50 isolate h-20">
				<div
					class="absolute -inset-x-4 -bottom-4 sm:-bottom-8 sm:-inset-x-8 h-24 bg-gradient-to-t from-black z-10 pointer-events-none"
				/>
				<button
					class="absolute w-auto bottom-0 inset-x-0 z-20 text-neutral-300 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded-md border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
					on:click|preventDefault={about_dialog.close}
					on:touchstart|preventDefault={about_dialog.close}>Loka</button
				>
			</div>
		</div>
	</div>
{/if}
