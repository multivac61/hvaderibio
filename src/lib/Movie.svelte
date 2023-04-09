<script lang="ts">
	import type { Movie, Showtimes } from '$lib/schemas'

	export let movie: Pick<Movie, 'poster_url' | 'title' | 'description' | 'trailer_url'>
	export let showtimes: [string, Showtimes][]

	let selected = false
</script>

<div
	class={`${
		selected ? 'col-span-full' : ''
	} flex flex-col sm:flex-row sm:items-start gap-4 md:gap-8`}
>
	<button
		on:click={() => {
			selected = !selected
		}}
		class={selected ? 'shrink-0 sm:w-80' : ''}
	>
		<img
			src={movie.poster_url}
			title={movie.title}
			alt={movie.title}
			class={`object-cover rounded-lg shadow-2xl aspect-[2/3] sm:w-[min(100%,360px)] ${
				selected ? '' : ''
			} hover:scale-105 hover:z-50 transition-all`}
		/>
	</button>
</div>
