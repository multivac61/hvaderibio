<script lang="ts">
	import type { Movie } from '$lib/schemas'

	export let showtimes: [string, Movie['showtimes']][]
</script>

<div>
	<div class="space-y-4">
		{#each showtimes as [cinema, times] (cinema)}
			<div>
				<div class="mb-2 text-sm text-neutral-200">{cinema}</div>
				<div class="inline-flex flex-wrap gap-3">
					{#each times as { time, purchase_url } (purchase_url)}
						<a
							class="tabular-nums px-2.5 py-1 text-base rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-600"
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
