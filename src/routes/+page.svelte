<script>
	const groupBy = (/** @type {any[]} */ list, /** @type {string} */ key) =>
		list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})

	const in_range = (
		/** @type {number} */ x,
		/** @type {number} */ from,
		/** @type {number} */ to
	) => from <= x && x <= to

	const float_to_hh_mm = (/** @type {number} */ time) => {
		return `${Math.floor(time)}:${(time % 1) * 60}`.replace(':0', ':00')
	}

	let [from, to] = [12, 23.5]

	const to_float = (/** @type {string | number | Date} */ date) => {
		const [hours, minutes] = new Date(date)
			.toLocaleTimeString('en', { timeStyle: 'short', hour12: false })
			.split(':')
		return parseFloat(hours) + parseFloat(minutes) / 60
	}
	/**
	 * @type {{ movies: import('./+page').RootObject[]; }}
	 */
	export let data

	$: all_cinemas = [
		...new Set(
			data.movies.flatMap((movie) => movie.showtimes.flatMap((showtime) => showtime.cinema))
		)
	]
	$: selected_cinemas = all_cinemas
	$: cinemas_in_two_cols = [
		all_cinemas.slice(0, Math.ceil(all_cinemas.length / 2)),
		all_cinemas.slice(Math.ceil(all_cinemas.length / 2))
	]

	const toggle = (/** @type {string} */ cinema) => {
		selected_cinemas = selected_cinemas.includes(cinema)
			? selected_cinemas.filter((c) => c !== cinema)
			: [...selected_cinemas, cinema]
	}

	$: filtered_cinemas_showtimes = data.movies
		.sort((a, b) => b.showtimes.length - a.showtimes.length)
		.filter((movie) =>
			movie.showtimes.some((showtime) => selected_cinemas.includes(showtime.cinema))
		)
		.filter((movie) =>
			movie.showtimes.some((showtime) => in_range(to_float(showtime.time), from, to))
		)
		.map((movie) => ({
			...movie,
			showtimes: Object.entries(
				groupBy(
					movie.showtimes
						.filter((showtime) => in_range(to_float(showtime.time), from, to))
						.filter((showtime) => selected_cinemas.includes(showtime.cinema)),
					'cinema'
				)
			)
		}))
</script>

<header>
	<div class="container">
		<hgroup>
			<h1>Hvað er í bíó?</h1>
			<h2>
				Í dag, {new Date()
					.toLocaleDateString('is-IS', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})
					.replace('dagur', 'daginn')}
			</h2>
		</hgroup>
	</div>
</header>
<main class="container">
	<div class="grid">
		<div style="white-space : break-spaces;">
			<label>
				Frá: {float_to_hh_mm(from)}
				<input bind:value={from} type="range" min="12" max="23.5" step="0.5" />
			</label>
			<label>
				Til: {float_to_hh_mm(to)}
				<input bind:value={to} type="range" min="12" max="23.5" step="0.5" />
			</label>
		</div>
		<div>
			<div class="grid">
				{#each cinemas_in_two_cols as cinemas}
					<div>
						<ul>
							{#each cinemas as cinema}
								<li>
									<!-- prettier-ignore -->
									<a style = {selected_cinemas.includes(cinema) ? undefined : "color: #606F79"}  href={'#'} on:click|preventDefault={() => toggle(cinema)}>{cinema}</a>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
			<br />
		</div>
	</div>
	{#each filtered_cinemas_showtimes as { title, poster_url, trailer_url, release_year, genres, showtimes, description }}
		<details>
			<summary> {title} ({release_year}) </summary>
			<div class="grid">
				<div>
					<img src={poster_url} alt={title} width="350px" />
					<br />
					<small>{genres.join(', ')}. <a href={trailer_url}>Sjá stiklu.</a></small>
					<br />
					<br />
				</div>
				<div>
					<small>{description}</small>
					<br />
					<br />
					{#each showtimes as [cinema, times]}
						<div>
							<abbr title={cinema}><small>{cinema}</small></abbr>
							<div style="white-space : break-spaces;">
								{#each times as { time, purchase_url }, i}
									<!-- prettier-ignore -->
									<small style='font-variant-numeric: tabular-nums;'>
											<a href={purchase_url}>{new Date(time).toLocaleTimeString('is-IS', { timeStyle: 'short', hour12: false })}&nbsp;</a>
									</small>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</details>
	{/each}
	{#if filtered_cinemas_showtimes.length == 0}
		<!-- prettier-ignore -->
		<p>
			Engin mynd uppfyllir skilyrðin. <a href={'#'} on:click|preventDefault={() => { [from, to] = [12, 23.5]; selected_cinemas = all_cinemas }}>Prófaðu að víkka þau.</a >
		</p>
	{/if}
</main>

<div class="container">
	<!-- prettier-ignore  -->
	<footer>
		<small>
			Hvað er í bíó? var verkefni unnið af <a href="https://hugihlynsson.com">Huga Hlynssyni</a>.  Núverandi útgáfa var uppfærð og unnin af <a href="https://twitter.com/olafurbogason">Ólafi Bjarka Bogasyni</a>.
		</small>
		<br>
		<small>
			Hugbúnaðurinn er opinn og frjálslega notanlegur á <a href="https://github.com/multivac61/hvaderibio">GitHub</a > þar sem vel er tekið á móti aðstoð og betrumbótum.
		</small>
	</footer>
</div>
