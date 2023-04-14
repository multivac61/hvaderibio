<script lang="ts">
	export let label: string
	export let is_selected: boolean
</script>

<button
	on:click|preventDefault
	class={`${
		is_selected ? 'bg-white bg-opacity-10 backdrop-blur-xl' : 'text-neutral-400'
	} rounded-md px-3 py-1.5 text-sm font-medium hover:text-white`}>{label}</button
>