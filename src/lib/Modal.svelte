<script lang="ts">
	import {
		Dialog,
		DialogDescription,
		DialogOverlay,
		DialogTitle
	} from '@rgossiaux/svelte-headlessui'
	export let open: boolean | undefined
	export let title: string | undefined
</script>

{#if open}
	<Dialog
		{open}
		on:close
		class="fixed inset-0 z-50 isolate sm:flex sm:justify-center sm:items-center"
	>
		<DialogOverlay class="fixed inset-0 bg-black/60" />

		<div
			class="relative rounded-2xl overflow-hidden bg-neutral-950 h-[calc(100dvh-32px)] sm:h-[calc(100dvh-120px)] sm:w-[min(100vw,640px)] m-4 z-10 border border-neutral-600 shadow-xl"
		>
			<div class="absolute inset-0 overflow-y-auto p-4 sm:p-8 pb-20 sm:pb-24 z-20">
				<DialogTitle class="font-bold mb-2 text-lg md:text-2xl">{title}</DialogTitle>
				<DialogDescription class="text-sm mb-4 text-neutral-300">
					<slot />
				</DialogDescription>
			</div>
			<div class="absolute bottom-0 inset-x-0 z-30 px-4">
				<div
					class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black z-40 pointer-events-none"
				/>
				<button
					class="absolute w-auto bottom-4 inset-x-4 sm:bottom-8 sm:inset-x-8 z-50 text-neutral-300 hover:text-white text-base shadow-neutral-800 px-2.5 py-2 rounded-md border border-neutral-600 bg-gradient-to-br from-neutral-800 to-neutral-900"
					on:click>Loka</button
				>
			</div>
		</div>
	</Dialog>
{/if}
