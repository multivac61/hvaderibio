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
      aria-pressed={label === selectedChoice}
      onclick={() => onSelect(label)}
      class={`focus-pill shrink-0 rounded-xl border px-3.5 py-1.5 text-[15px] leading-5 font-medium whitespace-nowrap transition-all duration-200 ease-out focus-visible:text-white
                    ${
                      label === selectedChoice
                        ? "border-sky-200/20 bg-sky-500/65 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
                        : "border-transparent bg-neutral-900/50 text-neutral-500 hover:bg-neutral-900/80 hover:text-neutral-200"
                    }
                  `}>
      {label}
    </button>
  {/each}
</div>
