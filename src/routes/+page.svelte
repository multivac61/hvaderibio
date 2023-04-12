<script lang="ts">
	import CinemaTab from '$lib/CinemaTab.svelte'
	import Movie from '$lib/Movie.svelte'
	import Showtimes from '$lib/Showtimes.svelte'
	import { browser } from '$app/environment'
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

	import { createDialog } from 'svelte-headlessui'
	import Transition from 'svelte-transition'

	let movie_dialog = createDialog({ label: 'Movie dialog' })
	let about_dialog = createDialog({ label: 'Um okkur' })

	$: if (browser) document.body.classList.toggle('noscroll', $movie_dialog.expanded || $about_dialog.expanded);
</script>

<div
	class="absolute inset-0 w-full min-h-screen bg-gradient-to-br from-neutral-900 to-black -z-30"
/>

<header class="my-4 sm:my-8 relative">
	<div class="sm:py-4 flex flex-col items-start md:items-center">
		<h1 class="text-5xl z-20 relative">
			<button
				on:click={about_dialog.open}
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
	class:scroll-lock={$movie_dialog.expanded}
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

<Transition show={$movie_dialog.expanded}>
	<Transition
		enter="ease-out duration-300"
		enterFrom="opacity-0"
		enterTo="opacity-100"
		leave="ease-in duration-200"
		leaveFrom="opacity-100"
		leaveTo="opacity-0"
	>
		<div class="fixed inset-0 bg-black bg-opacity-25" />
	</Transition>

	<div
		class="fixed inset-0 z-50 isolate sm:flex sm:justify-center sm:items-center backdrop-blur-sm"
	>
		<Transition
			enter="ease-out duration-300"
			enterFrom="opacity-0 scale-95"
			enterTo="opacity-100 scale-100"
			leave="ease-in duration-200"
			leaveFrom="opacity-100 scale-100"
			leaveTo="opacity-0 scale-95"
		>
			<div
				class="relative rounded-2xl bg-neutral-950 h-[calc(100dvh-32px)] sm:h-[calc(100dvh-240px)] sm:w-[min(100vw,860px)] m-4 border border-neutral-600 shadow-xl"
			>
				<div
					class="absolute overflow-y-auto inset-0 p-4 sm:p-8 pb-20 sm:pb-24"
					use:movie_dialog.modal
				>
					<h3 class="font-bold mb-2 text-lg md:text-2xl text-neutral-200">{movie?.title}</h3>
					<div class="mt-2 text-sm mb-4 text-neutral-300">
						<p class="mb-4 text-neutral-400">{movie?.description}</p>
						<a
							class="my-8 space-y-4 text-neutral-300 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
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
						<h2 class="pt-8 mb-2 text-base text-neutral-300 md:text-base">{data.today}</h2>
						{#if movie?.showtimes} <Showtimes showtimes={movie?.showtimes} /> {/if}
					</div>
				</div>
				<button
					class="absolute w-auto bottom-4 inset-x-4 sm:bottom-8 sm:inset-x-8 z-50 text-neutral-300 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded-md border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
					on:click>Loka</button
				>
			</div>
		</Transition>
	</div>
</Transition>

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
		{#each [...group_choices, ...all_choices] as [label, cinemas]}
			<option value={label} selected={label === selected_choice}>{label}</option>
		{/each}
	</select>
</div>

<Transition show={$about_dialog.expanded}>
	<Transition
		enter="ease-out duration-300"
		enterFrom="opacity-0"
		enterTo="opacity-100"
		leave="ease-in duration-200"
		leaveFrom="opacity-100"
		leaveTo="opacity-0"
	>
		<div class="fixed inset-0 bg-black bg-opacity-25" />
	</Transition>

	<div
		class="fixed overflow-hidden inset-0 z-50 isolate sm:flex sm:justify-center sm:items-center backdrop-blur-sm"
	>
		<Transition
			enter="ease-out duration-300"
			enterFrom="opacity-0 scale-95"
			enterTo="opacity-100 scale-100"
			leave="ease-in duration-200"
			leaveFrom="opacity-100 scale-100"
			leaveTo="opacity-0 scale-95"
		>
			<div
				class="relative rounded-2xl bg-neutral-950 h-[calc(100dvh-32px)] sm:h-[calc(100dvh-480px)] sm:w-[min(100vw,640px)] m-4 border border-neutral-600 shadow-xl"
			>
				<div
					class="absolute overflow-y-auto inset-0 p-4 sm:p-8 pb-20 sm:pb-24 text-neutral-200"
					use:about_dialog.modal
				>
					<div class="[&_a]:underline">
						<p class="pb-8">
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
						<p class="pb-10">
							Gögn eru fengin af <a class="hover:text-neutral-100" href="https://kvikmyndir.is"
								>kvikmyndir.is</a
							>. Hugbúnaður er aðgengilegur á
							<a class="hover:text-neutral-100" href="https://github.com/multivac61/hvaderibio"
								>GitHub</a
							>
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
				</div>
				<button
					class="absolute w-auto bottom-0 inset-x-4 sm:bottom-8 sm:inset-x-8 z-50 text-neutral-300 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded-md border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
					on:click>Loka</button
				>
			</div>
		</Transition>
	</div>
</Transition>