<script lang="ts">
  type Item = { value: string; label: string };
  import { on_radio_keydown } from "#lib/radio-group.js";

  type Props = {
    items: readonly Item[];
    selected: string;
    onSelect: (value: string) => void;
    /** The group's name for screen readers. */
    label: string;
  };

  const { items, selected, onSelect, label }: Props = $props();
  const values = $derived(items.map((item) => item.value));

  // One label style shared by the buttons and their highlighted copy, so the
  // copy's labels land on exactly the same pixels. Each item gets its label's
  // width and an equal share of what is left, so a long day name such as
  // Miðvikudag takes the room a short one does not need, and the four days
  // fit across a 320px phone's sheet.
  const label_class =
    "flex-auto rounded-lg px-1.5 py-2 text-center text-sm leading-4 font-medium whitespace-nowrap max-[22.5rem]:px-1 max-[22.5rem]:text-[13px]";
  const active_fill = "bg-pick-accent text-pick-on-accent";

  const uid = $props.id();
  let row: HTMLDivElement | undefined = $state();
  let buttons: HTMLButtonElement[] = $state([]);
  // The row's size changes when the web font arrives or the screen turns, and
  // every edge of the highlight has to follow it.
  let layout_version = $state(0);
  let clip: string | undefined = $state();
  let animate = $state(false);
  let focused = $state(-1);

  $effect(() => {
    if (!row) return;
    const observer = new ResizeObserver(() => layout_version++);
    observer.observe(row);
    return () => observer.disconnect();
  });

  // The highlight is a second copy of the row drawn in the chosen style and
  // clipped to the chosen item. Moving the clip carries the fill and the
  // white text across together, which separately timed colour changes on
  // each button never quite manage.
  $effect(() => {
    void layout_version;
    const button = buttons[items.findIndex((item) => item.value === selected)];
    if (!row || !button) {
      clip = undefined;
      return;
    }
    const right = row.offsetWidth - button.offsetLeft - button.offsetWidth;
    clip = `inset(0 ${right}px 0 ${button.offsetLeft}px round 8px)`;
    if (!animate) requestAnimationFrame(() => (animate = true));
  });

  const note_focus = (i: number) => (event: FocusEvent) => {
    focused = (event.currentTarget as HTMLElement).matches(":focus-visible") ? i : -1;
  };
</script>

<!-- Its own layer in the page's view transition, drawn live: in the shared
     snapshot the old highlight would fade out on top of the moving one. -->
<!-- A radio group: one tab stop, on the chosen item, and the arrow keys move
     the choice (radio-group.ts). -->
<div style:view-transition-name="segmented-{uid}" style:view-transition-class="live" class="bg-pick-ink/[0.06] rounded-[14px] p-1.5">
  <div bind:this={row} role="radiogroup" aria-label={label} class="relative flex">
    {#each items as item, i (item.value)}
      {@const active = item.value === selected}
      <!-- The button answers touches 8px above and below what it draws, so
           a finger need not land on a thin strip. -->
      <button
        bind:this={buttons[i]}
        type="button"
        role="radio"
        aria-checked={active}
        tabindex={active ? 0 : -1}
        onkeydown={(event) => on_radio_keydown(event, values, onSelect)}
        onclick={() => onSelect(item.value)}
        onfocus={note_focus(i)}
        onblur={() => (focused = -1)}
        class="relative select-none [transition:color_150ms_ease,transform_150ms_cubic-bezier(0.23,1,0.32,1)] before:absolute before:inset-x-0 before:-inset-y-2 active:scale-[0.97] motion-reduce:active:scale-100 {label_class} {active &&
        !clip
          ? active_fill
          : 'text-pick-ink/60 hover:text-pick-ink'}">
        <!-- Grey even when chosen: the white comes from the copy, arriving
             with the fill rather than ahead of it. -->
        {item.label}
      </button>
    {/each}

    <!-- Until the buttons can be measured (the prerendered page, the first
         frame) the chosen button paints its own fill instead. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 flex {active_fill} {animate
        ? 'ease-glide transition-[clip-path] duration-250 motion-reduce:transition-none'
        : ''}"
      style:clip-path={clip}
      hidden={!clip}>
      {#each items as item, i (item.value)}
        <!-- The focus ring the global style draws on the chosen button sits
             under this copy, so the copy draws it again. -->
        <span
          class="{label_class} {focused === i ? 'shadow-[inset_0_0_0_1px_rgb(255_255_255/0.85),inset_0_0_8px_rgb(255_255_255/0.16)]' : ''}">
          {item.label}
        </span>
      {/each}
    </div>
  </div>
</div>
