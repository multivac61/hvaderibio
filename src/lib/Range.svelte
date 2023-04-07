<script lang="ts">
	import { to_hhmm } from '$lib/util'

	export let name: string
	export let label: string
	export let value: number
</script>

<label for={name} class="grid grid-cols-[90px_1fr] items-center gap-2">
	<small class="flex gap-2">
		<div class="shrink-0 w-8 font-bold">{label}</div>
		<div>{to_hhmm(value)}</div>
	</small>
	<input
		class="cursor-pointer bg-transparent slider-thumb:border-none slider-track:bg-slate-700 slider-track:from-slate-800 slider-track:bg-gradient-to-b slider-track:rounded-full slider-track:shadow-inner slider-thumb:active:scale-110 slider-thumb:active:shadow-md slider-thumb:transition-all slider-thumb:-mt-0.5 slider-track:h-3"
		bind:value
		type="range"
		min="12"
		max="23.5"
		step="0.25"
		id={name}
		{name}
	/>
</label>
