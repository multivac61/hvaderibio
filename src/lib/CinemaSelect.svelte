<script lang="ts">
  import type { CinemaOption } from "#lib/cinemas.js";

  type Props = {
    cinemaOptions: readonly CinemaOption[];
    selectedChoice: string;
    onSelect: (choice: string) => void;
    id?: string;
    size?: "sm" | "md";
  };

  const { cinemaOptions, selectedChoice, onSelect, id = "select-cinemas", size = "md" }: Props = $props();
  const sizeClass = $derived(size === "sm" ? "min-h-8 py-1 text-xs" : "py-1 text-sm");

  const handleChange = (event: Event & { currentTarget: HTMLSelectElement }) => {
    onSelect(event.currentTarget.value);
  };
</script>

<div class="relative">
  <select
    value={selectedChoice}
    onchange={handleChange}
    {id}
    name={id}
    aria-label="Veldu kvikmyndahús"
    class="appearance-none rounded-full border border-white/10 bg-black/70 pr-8 pl-8 text-center font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_14px_rgba(0,0,0,0.26)] focus:border-sky-300/40 focus:ring-2 focus:ring-sky-300/15 focus:outline-none {sizeClass}">
    {#each cinemaOptions as [label] (label)}
      <option
        value={label}
        id={`option-${label}`}
        aria-label={label}
        selected={label === selectedChoice}
        class="bg-neutral-800 text-center text-white">
        {label}
      </option>
    {/each}
  </select>
  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
    <svg class="h-4 w-4 text-neutral-300/80" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fill-rule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.29a.75.75 0 01.02-1.06z"
        clip-rule="evenodd" />
    </svg>
  </div>
</div>
