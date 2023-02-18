<script>
	const groupBy = (/** @type {any[]} */ list, /** @type {string} */ key) =>
		list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})

	const float_to_hh_mm = (/** @type {number} */ time) => {
		return `${Math.floor(time)}:${(time % 1) * 60}`.replace(':0', ':00')
	}

	const to_float = (
		/** @type {string | number | Date} */ date,
		/** @type {number} */ to,
		/** @type {number} */ from
	) => {
		const [hours, minutes] = new Date(date)
			.toLocaleTimeString('en', { timeStyle: 'short', hour12: false })
			.split(':')
		return parseFloat(hours) + parseFloat(minutes) / 60
	}
	$: console.log(
		new Date().toLocaleDateString(['is-IS', 'de-DE'], {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	)
	/**
	 * @type {{ movies: import('./+page').RootObject[]; }}
	 */
	export let data

	let [from, to] = [14.5, 23.5]
	const in_range = (/** @type {number} */ x) => from <= x && x <= to

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

	const toggle_selected = (/** @type {string} */ cinema) => {
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
			movie.showtimes.some((showtime) => in_range(to_float(showtime.time), to, from))
		)
		.map((movie) => ({
			...movie,
			showtimes: Object.entries(
				groupBy(
					movie.showtimes
						.filter((showtime) => in_range(to_float(showtime.time), to, from))
						.filter((showtime) => selected_cinemas.includes(showtime.cinema)),
					'cinema'
				)
			)
		}))
</script>

<header class="container">
	<hgroup>
		<h1>Hvað er í bíó?</h1>
		<h2>
			Í dag, {new Date().toLocaleDateString('is-IS', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			}).replace('dagur', 'daginn')}
		</h2>
	</hgroup>
</header>

<div class="container">
	<div class="grid">
		<div>
			<label>
				Frá {float_to_hh_mm(from)}
				<input bind:value={from} type="range" min="14.5" max="23.5" step="0.5" />
			</label>
			<label>
				Til {float_to_hh_mm(to)}
				<input bind:value={to} type="range" min="14.5" max="23.5" step="0.5" />
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
										<!-- prettier-ignore -->
										<small>
											<a href={purchase_url}>{new Date(time).toLocaleTimeString('is-IS', { timeStyle: 'short', hour12: false })}</a>
										</small>
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
			Hmm. Engin mynd uppfyllir skilyrðin. <a href={'#'} on:click|preventDefault={() => { [from, to] = [14.5, 23.5]; selected_cinemas = all_cinemas }}>Prófaðu að víkka þau.</a >
		</p>
	{/if}
</main>
