<script lang="ts">
	import Dust from '$lib/Dust.svelte'
	import Movie from '$lib/Movie.svelte'
	import Range from '$lib/Range.svelte'
	import { group_by, in_range, to_float } from '$lib/util'
	import type { PageServerData } from './$types'

	export let data: PageServerData

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
</script>

<header>
	<div class="my-4 sm:my-24 flex flex-col items-start md:items-center">
		<div class="inset-y-0 left-1/2 z-10 -ml-[320px] absolute pointer-events-none"><Dust /></div>
		<h1 class="font-extrabold text-3xl sm:text-5xl z-20 relative uppercase">
			<div class="z-0 blur-3xl bg-slate-50/10 absolute -inset-10" />
			<span class="drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">Hvað er í bíó?</span>
		</h1>
		<h2 class="text-slate-200 z-20 md:text-xl md:mt-4">{data.today}</h2>
	</div>
	<div class="grid sm:grid-cols-2 gap-8">
		<div class="mb-4">
			<ul class="grid grid-cols-2 gap-x-4 gap-y-2">
				{#each all_cinemas as cinema}
					<li class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:group={selected_cinemas}
							value={cinema}
							id={cinema}
							name={cinema}
						/>
						<label for={cinema} class="min-w-0 truncate">{cinema}</label>
					</li>
				{/each}
				<li class="col-span-full">
					<button
						class="rounded-md text-left underline"
						on:click={() => {
							selected_cinemas = selected_cinemas.length === 0 ? all_cinemas : []
						}}
					>
						{selected_cinemas.length === 0 ? 'Velja' : 'Afvelja'} öll kvikmyndahús</button
					>
				</li>
			</ul>
		</div>
		<div class="space-y-4 tabular-nums">
			<Range label="Frá" name="from" bind:value={from} />
			<Range label="Til" name="to" bind:value={to} />
		</div>
	</div>
</header>
<div
	class="my-8 md:md-24 grid gap-x-2 gap-y-4 grid-cols-[repeat(auto-fill,minmax(min(10rem,100%),1fr))] z-50"
>
	{#each filtered_cinemas_showtimes as movie}
		<Movie {movie} showtimes={movie.showtimes} />
	{/each}
</div>
{#if filtered_cinemas_showtimes.length == 0}
	<p>
		Engin mynd uppfyllir skilyrðin. <button on:click={reset}>Prófaðu að víkka þau.</button>
	</p>
{/if}
<br />
<div class="container">
	<footer>
		<small>
			„Hvað er í bíó?“ upprunarlega unnin af <a href="https://hugihlynsson.com">Huga Hlynssyni</a>.
			Núverandi útgáfa útfærð af
			<a href="https://twitter.com/olafurbogason">Ólafi Bjarka Bogasyni</a>.
		</small>
		<small>
			Gögn eru fengin af <a href="https://kvikmyndir.is">kvikmyndir.is</a>. Hugbúnaður er
			aðgengilegur á <a href="https://github.com/multivac61/hvaderibio">GitHub</a> þar sem vel er
			tekið á móti athugasemdum og aðstoð.
			<a href="https://www.youtube.com/watch?v=v-u2NMzaduE">Góða skemmtun!</a>
		</small>
	</footer>
</div>
