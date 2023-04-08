<script lang="ts">
	import Dust from '$lib/Dust.svelte'
	import Movie from '$lib/Movie.svelte'
	import { group_by, in_range, to_float } from '$lib/util'

	export let data

	let [from, to] = [12, 23.5]

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
</script>

<svelte:window bind:outerWidth={width} bind:outerHeight={height} />

<header class="my-4 relative">
	<div class="py-8 sm:py-24 flex flex-col items-start md:items-center">
		<div class="w-full absolute pointer-events-none overflow-hidden">
			<Dust {width} {height} />
		</div>
		<h1 class="text-2xl sm:text-5xl z-20 relative">
			<div class="z-0 blur-3xl bg-slate-50/10 absolute -inset-10" />
			<span class="font-black drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] -tracking-[0.03em] uppercase">
				Hvað er í <span class="text-yellow-500">bíó</span>?
			</span>
		</h1>
		<h2 class="z-20 md:text-l md:mt-4 text-gray-300">
			{data.today}
		</h2>
	</div>
	<div class="grid sm:grid-cols-1 gap-8">
		<div class="mb-4">
			<ul class="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
				{#each all_cinemas as cinema}
					<li class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:group={selected_cinemas}
							value={cinema}
							id={cinema}
							name={cinema}
						/>
						<label for={cinema} class="min-w-0 truncate text-gray-300">{cinema}</label>
					</li>
				{/each}
				<li class="flex items-center gap-2 text-gray-300">
					<button
						class="rounded-md text-left underline"
						on:click={() => {
							selected_cinemas = selected_cinemas.length === 0 ? all_cinemas : []
						}}
					>
						{selected_cinemas.length === 0 ? 'Velja' : 'Afvelja'} allt</button
					>
				</li>
			</ul>
		</div>
	</div>
</header>
<div
	class="my-8 md:md-30 grid gap-x-6 gap-y-6 grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),2fr))] z-50"
>
	{#each filtered_cinemas_showtimes as movie (movie.title)}
		<Movie {movie} showtimes={movie.showtimes} />
	{/each}
</div>
{#if filtered_cinemas_showtimes.length == 0}
	<p>
		Engin mynd uppfyllir skilyrðin. <button on:click={reset}>Prófaðu að víkka þau.</button>
	</p>
{/if}

<div class="my-8">
	<footer class="[&_a]:underline text-slate-400 [&_a]:text-slate-300">
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
</div>
