<script lang="ts">
	import Showtimes from '$lib/Showtimes.svelte'
	import type { Movie } from '$lib/schemas'

	export let today: string
	export let movie: Omit<Movie, 'showtimes'> & { showtimes: [string, Movie['showtimes']][] }

	$: ({description, trailer_url, title, showtimes, imdb} = movie)
</script>

<h3 class="font-bold mb-2 text-lg md:text-2xl text-neutral-200">{title}</h3>
<div class="mt-2 text-sm mb-4 text-neutral-300">
	<p class="mb-4 text-neutral-400">{description}</p>
	<div class="inline-flex group gap-4 items-center">
		<a
			href={trailer_url}
			class="relative py-1 px-3 border border-[red] text-[red] text-sm font-medium rounded-md flex gap-2 items-center hover:border-red-400 hover:text-red-400"
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
		{#if imdb}
			<div class="group">
				<a
					href={imdb.link}
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
	<Showtimes showtimes={showtimes} />
</div>
