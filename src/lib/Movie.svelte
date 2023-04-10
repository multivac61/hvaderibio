<script lang="ts">
	import type { Movie } from '$lib/schemas'

	export let movie: Pick<Movie, 'poster_url' | 'title' | 'description' | 'trailer_url'>
	export let on_click: () => void
</script>

<button on:click={on_click}>
	<img
		src={movie.poster_url}
		title={movie.title}
		alt={movie.title}
		class="object-contain aspect-[2/3] rounded-md shadow-2xl sm:w-[min(100%,360px)] sm:hover:scale-105 sm:hover:z-50 sm:transition-all"
	/>
</button>
