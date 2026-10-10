<script lang="ts">
  import { AVAILABLE_DAYS, get_day_label } from "#lib/day-picker.js";

  type Props = {
    selectedDay: string;
    onSelect: (day: string) => void;
    days?: string[];
    size?: "sm" | "md";
    shrink?: boolean;
  };

  const { selectedDay, onSelect, days = AVAILABLE_DAYS, size = "md", shrink = false }: Props = $props();
  const buttonSizeClass = $derived(size === "sm" ? "py-1.25" : "py-1.5");
  const containerSizeClass = $derived(shrink ? "shrink-0" : "");

  let day_buttons: HTMLButtonElement[] = $state([]);
  let slider_style = $state("width: 0; left: 0; opacity: 0;");
  let slider_animated = $state(false);
  // Server-rendered pages cannot measure the buttons, so until the slider is
  // placed the chosen button draws the same pill itself; otherwise the first
  // frame shows no day chosen and the pill pops in after.
  let slider_placed = $state(false);
  const pill_class =
    "rounded-full border border-sky-200/20 bg-sky-500/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_3px_10px_rgba(14,165,233,0.22)] backdrop-blur-md";

  $effect(() => {
    const idx = days.indexOf(selectedDay);
    const btn = day_buttons[idx];
    if (btn) {
      slider_style = `width: ${btn.offsetWidth}px; left: ${btn.offsetLeft}px; opacity: 1;`;
      slider_placed = true;
      if (!slider_animated) {
        requestAnimationFrame(() => {
          slider_animated = true;
        });
      }
    }
  });
</script>

<div
  class="relative flex items-center overflow-hidden rounded-full border border-white/10 bg-neutral-950/65 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_22px_rgba(0,0,0,0.3)] backdrop-blur-xl {containerSizeClass}">
  <div
    class="absolute h-[calc(100%-6px)] {pill_class} {slider_animated ? 'transition-all duration-300 ease-out' : ''}"
    style={slider_style}>
  </div>
  {#each days as day, i (day)}
    <button
      bind:this={day_buttons[i]}
      type="button"
      aria-pressed={selectedDay === day}
      onclick={() => onSelect(day)}
      class="relative z-10 rounded-full px-2.5 text-[13px] leading-4 font-medium transition-colors duration-200 {buttonSizeClass} {selectedDay ===
      day
        ? 'text-white'
        : 'text-neutral-400 hover:text-neutral-200'}">
      {#if !slider_placed && selectedDay === day}
        <!-- Same box as the slider: the button's width, 1px short top and bottom. -->
        <span aria-hidden="true" class="absolute inset-x-0 inset-y-px -z-10 {pill_class}"></span>
      {/if}
      {get_day_label(day)}
    </button>
  {/each}
</div>
