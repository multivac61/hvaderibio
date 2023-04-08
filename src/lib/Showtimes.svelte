<script lang="ts">
	import type { Movie } from '$lib/schemas'

	export let showtimes: [string, Movie['showtimes']][]
</script>

<div>
	<div class="space-y-4">
		{#each showtimes as [cinema, times] (cinema)}
			<div>
				<div class="mb-2 font-bold">{cinema}</div>
				<div class="inline-flex flex-wrap gap-3">
					{#each times as { time, purchase_url } (purchase_url)}
						<a
							class="tabular-nums px-2.5 py-1 rounded-md bg-neutral-800 text-white"
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
