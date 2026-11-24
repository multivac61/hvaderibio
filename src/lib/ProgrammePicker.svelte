<script lang="ts">
  // The chosen day and cinema as one phrase, "Í dag · Höfuðborgarsvæðið",
  // which opens both choices together. Wide screens open it in place: the
  // pill grows into the panel. Phones get a bottom sheet, within reach of
  // the thumb and dismissed with a pull.
  import { Popover } from "bits-ui";
  import type { CinemaOption } from "#lib/cinemas.js";
  import { get_day_label } from "#lib/day-picker.js";
  import BottomSheet from "#lib/BottomSheet.svelte";
  import ProgrammeChoices from "#lib/ProgrammeChoices.svelte";
  import { is_keyboard_navigation } from "#lib/input-modality.js";

  type Props = {
    cinemaOptions: readonly CinemaOption[];
    cinema: string;
    day: string;
    onCinema: (cinema: string, slide: boolean) => void;
    onDay: (day: string) => void;
    presentation: "header" | "floating" | "inline";
    id: string;
  };

  const { cinemaOptions, cinema, day, onCinema, onDay, presentation, id }: Props = $props();

  let open = $state(false);
  const height = $derived(presentation === "header" ? 48 : 40);
  const text_size = $derived(presentation === "header" ? "text-[17px]" : "text-[15px]");
  const align = $derived(presentation === "header" ? "center" : "start");

  // Turned or resized across the phone's width (Tailwind's sm), the open
  // panel or sheet belongs to a pill that has just been hidden, and would
  // stand beside nothing. Put it away; the pill now shown opens the other.
  $effect(() => {
    if (!open) return;
    const wide = matchMedia("(min-width: 40rem)");
    const put_away = () => (open = false);
    wide.addEventListener("change", put_away);
    return () => wide.removeEventListener("change", put_away);
  });

  // A pill low in the window, like the movie page's below its trailer, opens
  // a panel that runs past the bottom: bring the page up just enough to show
  // it, as the panel grows.
  let panel: HTMLElement | null = $state(null);
  $effect(() => {
    if (!open || !panel) return;
    const target = panel;
    const frame = requestAnimationFrame(() =>
      target.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
    );
    return () => cancelAnimationFrame(frame);
  });

  // Where focus goes as the panel opens. bits-ui would put it on the first
  // button, the phrase row, and Safari ringed that even after a click. From
  // the keyboard it goes to the chosen day, ready for the arrow keys; from a
  // pointer, to the panel itself, which draws no ring.
  const focus_on_open = (event: Event) => {
    event.preventDefault();
    const target = is_keyboard_navigation()
      ? panel?.querySelector<HTMLElement>('[role="radiogroup"] [role="radio"][aria-checked="true"]')
      : panel;
    target?.focus({ preventScroll: true });
  };

  // A press outside the panel puts it away, and that is all it does, as with
  // a menu or the phone's sheet: the click it ends in went on to open the
  // poster underneath. Armed by the press itself, not by bits-ui's dismissal,
  // which comes a moment later and can miss a quick click. A touch opens a
  // poster on touchend (MoviePosterCard), so that stops here too. A press that
  // never becomes a click (a drag) lets the next one through.
  $effect(() => {
    if (!open || presentation === "floating") return;
    const trigger = document.getElementById(id);
    let armed = false;
    const on_press = (event: PointerEvent) => {
      const target = event.target as Node;
      armed = !panel?.contains(target) && !trigger?.contains(target);
    };
    const on_touchend = (event: TouchEvent) => {
      if (armed) event.stopPropagation();
    };
    const on_click = (event: MouseEvent) => {
      if (!armed) return;
      armed = false;
      event.preventDefault();
      event.stopPropagation();
      open = false;
    };
    addEventListener("pointerdown", on_press, true);
    addEventListener("touchend", on_touchend, true);
    addEventListener("click", on_click, true);
    return () => {
      // The panel closes on the press, before its click arrives: keep
      // listening for that one click.
      removeEventListener("pointerdown", on_press, true);
      removeEventListener("touchend", on_touchend, true);
      if (!armed) return removeEventListener("click", on_click, true);
      const forget = () => {
        removeEventListener("click", on_click, true);
        removeEventListener("pointerdown", forget, true);
      };
      addEventListener("pointerdown", forget, true);
      addEventListener("click", forget);
    };
  });

  // A cinema clicked puts the panel away first, and lands once it is gone:
  // the posters then slide with nothing over them. Landing at once, the
  // panel shrank inside the page's transition, and looked to close and open
  // again. Opened again before it got there, the panel lands it at once,
  // with no slide under the open panel. The sheet goes at once either way:
  // phones play no transition. A cinema reached by the arrow keys lands at
  // once, with the panel open.
  let landing: string | null = null;
  const pick_cinema = (choice: string, finish: boolean) => {
    if (!finish) return onCinema(choice, false);
    if (presentation === "floating") onCinema(choice, true);
    else landing = choice;
    open = false;
  };
  const land = (now_open: boolean) => {
    if (landing === null) return;
    const choice = landing;
    landing = null;
    onCinema(choice, !now_open);
  };
</script>

{#snippet phrase(action = "Breyta vali")}
  <span class="sr-only">{action}:</span>
  <svg
    class="text-pick-highlight size-4 shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    aria-hidden="true">
    <rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke-linecap="round" />
  </svg>
  <span class="text-pick-ink font-semibold whitespace-nowrap">{get_day_label(day)}</span>
  <span class="text-pick-ink/30" aria-hidden="true">·</span>
  <span class="text-pick-ink/80 truncate font-medium">{cinema}</span>
  <svg
    class="programme-caret text-pick-ink/50 size-3.5 shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    aria-hidden="true">
    <path d="M4.5 6.5 8 10l3.5-3.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{/snippet}

{#snippet choices()}
  <ProgrammeChoices {cinemaOptions} {cinema} {day} {onDay} onCinema={pick_cinema} />
{/snippet}

{#if presentation === "floating"}
  <BottomSheet
    bind:open
    title="Hvenær og hvar?"
    triggerId={id}
    triggerClass="flex h-11 max-w-full items-center gap-2 rounded-full bg-pick-surface/80 px-4 text-[15px] shadow-(--pick-shadow-pill) backdrop-blur-2xl transition-transform duration-150 ease-snappy select-none active:scale-[0.97] motion-reduce:active:scale-100">
    {#snippet trigger()}{@render phrase()}{/snippet}
    {@render choices()}
  </BottomSheet>
{:else}
  <div class={presentation === "header" ? "flex justify-center" : ""}>
    <Popover.Root bind:open onOpenChangeComplete={land}>
      <!-- Open, the panel carries this phrase where the pill was; the pill
           makes way, or it showed through the glass as a second pill. -->
      <Popover.Trigger
        {id}
        style="height: {height}px"
        class="ease-snappy bg-pick-surface/90 flex max-w-full items-center gap-2 rounded-full px-5 shadow-(--pick-shadow-pill) backdrop-blur-2xl transition-transform duration-150 select-none active:scale-[0.97] data-[state=open]:opacity-0 motion-reduce:active:scale-100 {text_size}">
        {@render phrase()}
      </Popover.Trigger>
      <Popover.Portal>
        <!-- Pulled back over the trigger by its own height, so the panel's
             first row is exactly where the pill is. Always below and never
             shifted: the clip grows from where the pill is, so the panel
             must not move away from it near a screen edge. -->
        <Popover.Content
          bind:ref={panel}
          side="bottom"
          sideOffset={-height}
          {align}
          avoidCollisions={false}
          onOpenAutoFocus={focus_on_open}
          tabindex={-1}
          aria-label="Hvenær og hvar?"
          data-align={align}
          class="programme-panel z-50 w-[22.5rem] max-w-[calc(100vw-2rem)] min-w-(--bits-popover-anchor-width) rounded-[22px] outline-none">
          <!-- The shape that grows. The drop shadow stays outside it, on the
               panel, where a clip cannot cut it off. -->
          <div
            class="programme-panel-clip bg-pick-panel flex max-h-[max(20rem,var(--bits-popover-content-available-height))] flex-col rounded-[22px] shadow-(--pick-edge-panel)">
            <!-- The pill's phrase, carried by the panel as it grows; it closes
               the panel the way the pill opened it. -->
            <button
              type="button"
              data-panel-phrase
              onclick={() => (open = false)}
              style="height: {height}px"
              class="flex shrink-0 items-center gap-2 px-5 select-none {align === 'center' ? 'justify-center' : ''} {text_size}">
              {@render phrase("Loka vali")}
            </button>
            <!-- A long list scrolls inside the panel, under the phrase, rather
               than running off the screen. -->
            <div class="programme-panel-body min-h-0 overflow-y-auto overscroll-contain px-3.5 pb-3.5">
              {@render choices()}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  </div>
{/if}

<style>
  /* bits-ui gives the panel the trigger's size as variables. Closed, the
     shape is clipped to exactly that box at the pill's corner radius; open,
     to the whole panel. Both ways it leaves at once and lands softly: an
     in-out start held the shape still under the click, which read as lag.
     It opens within the 250ms a popover gets, and closes faster, since a
     cinema clicked waits for the close (pick_cinema). */
  :global(.programme-panel) {
    --w: var(--bits-popover-anchor-width);
    --h: var(--bits-popover-anchor-height);
    position: relative;
    isolation: isolate;
  }
  /* The drop shadow, on a layer of its own beneath the shape, where the clip
     cannot cut it off. It arrives as the shape fills out and leaves with
     it, by opacity, which the compositor runs; a box-shadow transition
     repainted it every frame. */
  :global(.programme-panel::before) {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: 22px;
    box-shadow: var(--pick-shadow-panel);
    pointer-events: none;
    transition: opacity 150ms cubic-bezier(0.23, 1, 0.32, 1) 100ms;
  }
  :global(.programme-panel[data-starting-style]::before),
  :global(.programme-panel[data-ending-style]::before) {
    opacity: 0;
  }
  :global(.programme-panel[data-ending-style]::before) {
    transition-delay: 0ms;
  }
  /* It also ends see-through, over the pill already shown beneath it. Where
     the compositor runs the clip, Chromium (Dia) drew one frame of the
     panel without it as the clip ended: the whole panel, empty, flashing
     back after it had closed. See-through, that frame shows nothing. This
     is also the panel's own transition that bits-ui waits for before it
     lets the panel go, and it ends with the clip. */
  :global(.programme-panel[data-ending-style]) {
    opacity: 0;
    transition: opacity 40ms linear 110ms;
  }

  :global(.programme-panel-clip) {
    clip-path: inset(0 round 22px);
    transition: clip-path 250ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  :global(.programme-panel[data-ending-style] .programme-panel-clip) {
    transition-duration: 150ms;
  }
  :global(.programme-panel[data-align="center"][data-starting-style] .programme-panel-clip),
  :global(.programme-panel[data-align="center"][data-ending-style] .programme-panel-clip) {
    clip-path: inset(0 calc(50% - var(--w) / 2) calc(100% - var(--h)) round calc(var(--h) / 2));
  }
  :global(.programme-panel[data-align="start"][data-starting-style] .programme-panel-clip),
  :global(.programme-panel[data-align="start"][data-ending-style] .programme-panel-clip) {
    clip-path: inset(0 calc(100% - var(--w)) calc(100% - var(--h)) 0 round calc(var(--h) / 2));
  }

  :global(.programme-panel-clip) {
    /* Safari's name first: the minifier takes the two for one property and
       keeps only the last written, and Chromium reads only the standard one. */
    -webkit-backdrop-filter: var(--pick-panel-blur);
    backdrop-filter: var(--pick-panel-blur);
  }

  /* The panel's caret turns with the shape: down as the pill's, as it grows
     out of it; up once open; down again by the time it is back in the pill,
     so the pill takes over the same caret. Jumping, it flipped in one frame,
     and on the way out the up caret faded over the pill's down one. */
  :global(.programme-panel .programme-caret) {
    rotate: 180deg;
    transition: rotate 250ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  :global(.programme-panel[data-starting-style] .programme-caret),
  :global(.programme-panel[data-ending-style] .programme-caret) {
    rotate: 0deg;
  }
  :global(.programme-panel[data-ending-style] .programme-caret) {
    transition-duration: 150ms;
  }

  /* The choices fade in once the shape has mostly grown, and out at once. */
  :global(.programme-panel-body) {
    transition: opacity 170ms cubic-bezier(0.23, 1, 0.32, 1) 80ms;
  }
  :global(.programme-panel[data-starting-style] .programme-panel-body),
  :global(.programme-panel[data-ending-style] .programme-panel-body) {
    opacity: 0;
    transition-delay: 0ms;
    transition-duration: 70ms;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.programme-panel),
    :global(.programme-panel[data-ending-style]) {
      transition: opacity 150ms ease;
    }
    :global(.programme-panel[data-starting-style]),
    :global(.programme-panel[data-ending-style]) {
      opacity: 0;
    }
    :global(.programme-panel .programme-caret) {
      transition: none;
    }
    :global(.programme-panel-clip),
    :global(.programme-panel[data-starting-style] .programme-panel-clip),
    :global(.programme-panel[data-ending-style] .programme-panel-clip) {
      clip-path: inset(0 round 22px) !important;
      transition: none;
    }
  }
</style>
