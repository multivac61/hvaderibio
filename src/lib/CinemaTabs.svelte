<script lang="ts">
  import type { CinemaOption } from "#lib/cinemas.js";

  type Props = {
    cinemaOptions: readonly CinemaOption[];
    selectedChoice: string;
    onSelect: (choice: string) => void;
  };

  const { cinemaOptions, selectedChoice, onSelect }: Props = $props();
</script>

<div class="mb-3 flex flex-nowrap justify-center gap-1.5 overflow-x-auto px-2 md:gap-2">
  {#each cinemaOptions as [label] (label)}
    <button
      type="button"
      onclick={() => onSelect(label)}
      class={`shrink-0 rounded-xl border px-3.5 py-1.5 text-[15px] leading-5 font-medium whitespace-nowrap transition-all duration-200 ease-out focus-visible:border-white focus-visible:text-white focus-visible:outline-none
                    ${
                      label === selectedChoice
                        ? "border-sky-300/35 bg-neutral-950/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_6px_18px_rgba(0,0,0,0.28)]"
                        : "border-transparent bg-neutral-900/50 text-neutral-500 hover:bg-neutral-900/80 hover:text-neutral-200"
                    }
                  `}>
      {label}
    </button>
  {/each}
</div>
