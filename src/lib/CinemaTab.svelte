<script lang="ts">
	export let label: string
	export let is_selected: boolean
	export let on_click: () => void
</script>

<button
	on:click={on_click}
	class={`${
		is_selected ? 'bg-white bg-opacity-10 backdrop-blur-xl' : 'text-neutral-400'
	} rounded-lg px-3 py-1.5 text-sm font-medium hover:text-white`}>{label}</button
>
