<script lang="ts">
	import Showtimes from '$lib/Showtimes.svelte'
	import { type Movie, type Showtime } from '$lib/schemas'

	export let today: string
	export let selected_movie: Omit<Movie, 'showtimes'> & { showtimes: [string, Showtime[]] }

	$: ({ description, trailer_url, title, showtimes, imdb } = selected_movie)
	export let movie_title
	export let movie_description
</script>

<h3 class="font-bold mb-2 text-lg md:text-2xl text-neutral-200" melt={$movie_title}>{title}</h3>
<div class="mt-2 text-sm mb-4 text-neutral-300" melt={$movie_description}>
	<p class="mb-4 text-neutral-400">{description}</p>
	<div class="flex group gap-4 items-center">
		<a
			target="_blank"
			rel="noopener noreferrer"
			href={trailer_url}
			class="relative py-1 px-3 border border-gray-300 text-gray-300 text-sm font-medium rounded-md flex gap-2 items-center hover:border-gray-400 hover:text-gray-400"
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
			Stikla
		</a>
		{#if imdb}
			<div class="group">
				<a
					href={imdb.link}
					target="_blank"
					rel="noopener noreferrer"
					class="relative py-1 px-3 border border-[#f6c700] text-[#f6c700] text-sm font-medium rounded-md hover:border-yellow-200 hover:text-yellow-200"
				>
					<span
						class="absolute inset-0 rounded-md opacity-20 shadow-[inset_0_1px_1px_white] transition-opacity group-hover:opacity-20"
					/>
					IMDb · {imdb.star}</a
				>
			</div>
		{/if}
	</div>
	<h2 class="my-6 text-neutral-400 text-sm">{today}</h2>
	<Showtimes {showtimes} />
</div>
