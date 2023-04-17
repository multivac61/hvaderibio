<script lang="ts">
	import Showtimes from '$lib/Showtimes.svelte'
	import type { IMDbMovie, Movie } from '$lib/schemas'
	import ky from 'ky'
	import { onMount } from 'svelte'

	export let today: string
	export let movie: Omit<Movie, 'showtimes'> & {
		showtimes: [string, Movie['showtimes']][]
	}

	let imdb: null | { link: string; rating: number } = null

	onMount(() => {
		const imdbLink = movie.rating_urls.find((link) => link.includes('imdb.com'))
		if (imdbLink) {
			const imdbId = new URL(imdbLink).pathname.split('/').at(-1)
			if (imdbId) {
				ky.get(`https://imdb-api.projects.thetuhin.com/title/${imdbId}`)
					.json<IMDbMovie>()
					.then((response) => {
						imdb = { link: imdbLink, rating: response.rating.star }
					})
			}
		}
	})
</script>

<h3 class="font-bold mb-2 text-lg md:text-2xl text-neutral-200">{movie.title}</h3>
<div class="mt-2 text-sm mb-4 text-neutral-300">
	<p class="mb-4 text-neutral-400">{movie.description}</p>
	<div class="inline-flex gap-4 items-center">
		{#if imdb !== null}
			<a
				href={imdb.link}
				class="relative py-1 px-3 border border-[#f6c700] text-[#f6c700] text-sm font-medium rounded-md"
			>
				<span
					class="absolute inset-0 rounded-md opacity-20 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-20"
				/>
				IMDb · {imdb.rating}</a
			>
		{/if}
		<a
			href={movie.trailer_url}
			class="relative py-1 px-3 border border-[red] text-[red] text-sm font-medium rounded-md flex gap-2 items-center"
		>
			<span
				class="absolute inset-0 rounded-md opacity-20 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-20"
			/>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				width="12"
				height="12"
				class="fill-current"
			>
				<path d="M3 22V2L21 12L3 22Z" />
			</svg>
			Horfa á stiklu
		</a>
	</div>
	<h2 class="my-6 text-neutral-400 text-sm">{today}</h2>
	<Showtimes showtimes={movie.showtimes} />
</div>
