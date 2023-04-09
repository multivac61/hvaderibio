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
		class="object-cover rounded-lg shadow-2xl aspect-[2/3] sm:w-[min(100%,360px)] hover:scale-105 hover:z-50 transition-all"
	/>
</button>
