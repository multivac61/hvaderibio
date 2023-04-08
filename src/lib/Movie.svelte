<script lang="ts">
	import type { Movie } from '$lib/schemas'

	export let movie: Pick<Movie, 'poster_url' | 'title' | 'description' | 'trailer_url'>
	export let on_click: () => void
</script>

<div class="flex flex-col sm:flex-row sm:items-start gap-4 md:gap-8 z-50">
	<button on:click={on_click}>
		<img
			src={movie.poster_url}
			title={movie.title}
			alt={movie.title}
			class="object-cover rounded-xl shadow-2xl aspect-[2/3] sm:w-[min(100%,360px)]"
		/>
	</button>
</div>
