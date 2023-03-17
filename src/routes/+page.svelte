<script lang="ts">
	import { to_hhmm, to_float, in_range, group_by } from '$lib/util'

	export let data

	let [from, to] = [12, 23.5]

	const all_cinemas = [
		...new Set(
			data.movies.flatMap((movie) => movie.showtimes.flatMap((showtime) => showtime.cinema))
		)
	].sort()

	$: cinemas_in_two_cols = [
		all_cinemas.slice(0, Math.ceil(all_cinemas.length / 2)),
		all_cinemas.slice(Math.ceil(all_cinemas.length / 2))
	]

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
</script>

<header>
	<div class="container">
		<hgroup>
			<h1>Hvað er í bíó?</h1>
			<h2>{data.today}</h2>
		</hgroup>
	</div>
	<div class="grid">
		<div style="font-variant-numeric: tabular-nums;">
			<label for="from">
				<small> Frá {to_hhmm(from)} </small>
				<!-- prettier-ignore -->
				<input bind:value={from} type="range" min="12" max="23.5" step="0.25" id="from" name="from" />
			</label>
			<label for="to">
				<small> Til {to_hhmm(to)} </small>
				<input bind:value={to} type="range" min="12" max="23.5" step="0.25" id="to" name="to" />
			</label>
		</div>
		<div>
			<div class="grid">
				{#each cinemas_in_two_cols as cinemas (cinemas)}
					<div>
						<ul>
							{#each cinemas as cinema (cinema)}
								<li style="list-style-type: none;">
									<small>
										<!-- prettier-ignore -->
										<input type=checkbox bind:group={selected_cinemas} value={cinema} id={cinema} name={cinema} />
										<label for={cinema}>{cinema}</label>
									</small>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
			<ul>
				<li style="list-style-type: none;">
					<small>
						<!-- prettier-ignore -->
						<a href="# " target="_blank" style="text-align: center; a:visited: a:link" on:click|preventDefault={() => { selected_cinemas = selected_cinemas.length === 0 ? all_cinemas : [] }}>{selected_cinemas.length === 0 ? 'Velja' : 'Afvelja'} öll kvikmyndahús</a>
					</small>
				</li>
			</ul>
		</div>
	</div>
</header>
{#each filtered_cinemas_showtimes as { title, poster_url, trailer_url, release_year, genres, showtimes, description } (title)}
	<details>
		<summary> {title} </summary>
		<div class="grid">
			<div>
				<a href={trailer_url} target="_blank">
					<img
						src={poster_url}
						title="Horfa á stiku {title} ({release_year}). {genres.join(', ')}"
						alt="Poster for movie"
						width="400px"
						height="600px"
					/>
				</a>
			</div>
			<div>
				<small>{description}</small>
				<br /> <br />
				{#each showtimes as [cinema, times] (cinema)}
					<div>
						<abbr title={cinema}><small>{cinema}</small></abbr>
						<div style="white-space : break-spaces;">
							{#each times as { time, purchase_url } (purchase_url)}
								<!-- prettier-ignore -->
								<small style='font-variant-numeric: tabular-nums;'>
									<a href={purchase_url}>{new Date(time).toLocaleTimeString('is-IS', { timeStyle: 'short', hour12: false })}</a>&nbsp;&nbsp;
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
		Engin mynd uppfyllir skilyrðin. <a href={'#'} on:click|preventDefault={() => { [from, to] = [12, 23.5]; selected_cinemas = all_cinemas }}>Prófaðu að víkka þau.</a>
	</p>
{/if}
<br />
<div class="container">
	<!-- prettier-ignore  -->
	<footer>
		<small>
			„Hvað er í bíó?“ upprunarlega unnin af <a href="https://hugihlynsson.com">Huga Hlynssyni</a>. Núverandi útgáfa útfærð af <a href="https://twitter.com/olafurbogason">Ólafi Bjarka Bogasyni</a>.
		</small>
		<small>
			Gögn eru fengin af <a href="https://kvikmyndir.is">kvikmyndir.is</a>. Hugbúnaður er aðgengilegur á <a href="https://github.com/multivac61/hvaderibio">GitHub</a> þar sem vel er tekið á móti athugasemdum og aðstoð. <a href="https://www.youtube.com/watch?v=v-u2NMzaduE">Góða skemmtun!</a>
		</small>
	</footer>
</div>
