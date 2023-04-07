<script lang="ts">
	import type { Movie } from '$lib/schemas'

	export let movie: Pick<Movie, 'poster_url' | 'title' | 'description' | 'trailer_url'>
	export let showtimes: [Movie['showtimes'][0]['cinema'], Movie['showtimes']][]

	let selected = false
</script>

<div
	class={`${
		selected ? 'col-span-full' : ''
	} flex flex-col sm:flex-row sm:items-start gap-4 md:gap-8 md:pb-8`}
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
			class={`object-cover rounded-xl shadow-2xl aspect-[2/3] sm:w-[min(100%,360px)] ${
				selected ? 'max-w-[calc(50%-4px)] sm:max-w-none' : ''
			}`}
		/>
	</button>
	{#if selected}
		<div class="grow">
			<div class="font-bold mb-2 text-lg md:text-2xl">{movie.title}</div>
			<div class="text-sm mb-4">
				{movie.description} —
				<a class="underline" href={movie.trailer_url} target="_blank"> Trailer. </a>
			</div>
			<div class="space-y-4">
				{#each showtimes as [cinema, times] (cinema)}
					<div>
						<div class="mb-2 font-bold">{cinema}</div>
						<div class="inline-flex flex-wrap gap-3">
							{#each times as { time, purchase_url } (purchase_url)}
								<a
									class="tabular-nums px-2.5 py-1 rounded bg-slate-800 text-white shadow"
									href={purchase_url}
								>
									{new Date(time).toLocaleTimeString('is-IS', {
										timeStyle: 'short',
										hour12: false
									})}
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
