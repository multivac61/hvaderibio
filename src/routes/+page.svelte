<script>
	import Moment from 'moment'
	import 'moment/dist/locale/is'
	import { extendMoment } from 'moment-range'
	import { groupBy } from 'lodash'

	const moment = extendMoment(Moment)

	/**
	 * @type {{ movies: import('./+page').RootObject[]; }}
	 */
	export let data

	const default_state = () => [14.5, 23.5]
	let [from, to] = default_state()

	const parse = (/** @type {number} */ time) =>
		moment().set({ hour: Math.floor(time), minute: (time % 1) * 60, second: 0, millisecond: 0 })
	$: range = moment.range(parse(from), parse(to))

	$: all_cinemas = [
		...new Set(
			data.movies.flatMap((movie) => movie.showtimes.flatMap((showtime) => showtime.cinema))
		)
	]
	$: selected_cinemas = all_cinemas
	$: two_halves_cinemas = [
		all_cinemas.slice(0, Math.ceil(all_cinemas.length / 2)),
		all_cinemas.slice(Math.ceil(all_cinemas.length / 2))
	]

	const toggle_selected = (/** @type {string} */ cinema) => {
		selected_cinemas = selected_cinemas.includes(cinema)
			? selected_cinemas.filter((c) => c !== cinema)
			: [...selected_cinemas, cinema]
	}

	$: filtered_cinemas_showtimes = data.movies
		.sort((a, b) => b.showtimes.length - a.showtimes.length)
		.filter((movie) =>
			movie.showtimes
				.map((showtime) => showtime.cinema)
				.some((cinema) => selected_cinemas.includes(cinema))
		)
		.filter((movie) =>
			movie.showtimes
				.map((showtime) => moment(showtime.time))
				.some((showtime) => range.contains(showtime))
		)
		.map((movie) => ({
			...movie,
			showtimes: Object.entries(
				groupBy(
					movie.showtimes
						.filter((showtime) => range.contains(moment(showtime.time)))
						.filter((showtime) => selected_cinemas.includes(showtime.cinema)),
					'cinema'
				)
			)
		}))
</script>

<header class="container">
	<hgroup>
		<h1>Hvað er í bíó?</h1>
		<h2>Í dag, {moment().locale('is').format('D. MMMM Y')}</h2>
	</hgroup>
</header>

<div class="container">
	<div class="grid">
		<div>
			<label>
				Frá {parse(from).format('HH:mm')}
				<input bind:value={from} type="range" min="14.5" max="23.5" step="0.5" />
			</label>
			<label>
				Til {parse(to).format('HH:mm')}
				<input bind:value={to} type="range" min="14.5" max="23.5" step="0.5" />
			</label>
		</div>
		<div>
			<div class="grid">
				{#each two_halves_cinemas as cinemas}
					<div>
						<ul>
							{#each cinemas as cinema}
								<li>
									<!-- prettier-ignore -->
									{#if selected_cinemas.includes(cinema)}
										<b><a href={'#'} on:click|preventDefault={() => toggle_selected(cinema)}>{cinema}</a></b>
									{:else}
										<a href={'#'} on:click|preventDefault={() => toggle_selected(cinema)}>{cinema}</a>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
			<br />
		</div>
	</div>
</div>

<main class="container">
	{#if filtered_cinemas_showtimes.length > 0}
		{#each filtered_cinemas_showtimes as { title, poster_url, trailer_url, release_year, genres, showtimes, description }}
			<details>
				<summary> {title} ({release_year}) </summary>
				<div class="grid">
					<div>
						<img src={poster_url} alt={title} width="250px" />
						<br />
						<small>{genres.join(', ')}</small>
						<br />
						<small><a href={trailer_url}>Sjá stiklu</a></small>
					</div>
					<div><p>{description}</p></div>
					<div>
						{#each showtimes as [cinema, times]}
							<div>
								<b>{cinema}</b>
								<br />
								<div style="white-space : break-spaces;">
									{#each times as { time, purchase_url }, i}
										<small><a href={purchase_url}>{moment(time).format('HH:mm')}</a> </small>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</details>
		{/each}
	{:else}
		<!-- prettier-ignore -->
		<p>
			Hmm. Engin mynd uppfyllir skilyrðin. <a href={'#'} on:click|preventDefault={() => { [from, to] = default_state(); selected_cinemas = all_cinemas }}>Prófaðu að víkka þau.</a >
		</p>
	{/if}
</main>
