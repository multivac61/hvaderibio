<script lang="ts">
  // A bottom sheet on bits-ui's Dialog (focus trap, Escape, scroll lock),
  // with our own drag to dismiss. While the finger is down the sheet is the
  // finger: transform written directly, 1:1, resisting past the top. On
  // release it closes if pulled far enough or flicked, and otherwise snaps
  // back fast. The overlay's opacity, and the page stepped back behind the
  // sheet (sheet-stage.ts), follow the same drag.
  //
  // Where the sheet fits the screen, it drags from anywhere. Where it is
  // taller (small phones, landscape), the list scrolls under the handle and
  // title, a vertical swipe on it belongs to scrolling, and the sheet drags
  // from the handle and title.
  import { Dialog } from "bits-ui";
  import type { Snippet } from "svelte";
  import { drop_stage, follow_stage, push_stage, release_stage } from "#lib/sheet-stage.js";

  type Props = {
    open: boolean;
    title: string;
    triggerId?: string;
    triggerClass: string;
    trigger: Snippet;
    children: Snippet;
  };

  let { open = $bindable(), title, triggerId, triggerClass, trigger, children }: Props = $props();

  let sheet: HTMLElement | null = $state(null);
  let overlay: HTMLElement | null = $state(null);

  const DRAG_START = 10; // px before a press becomes a drag, so taps stay taps
  const DISMISS_FRACTION = 0.4;
  const DISMISS_VELOCITY = 0.4; // px/ms: a flick closes it whatever the distance
  const SNAP_BACK = "transform 250ms cubic-bezier(0.32, 0.72, 0, 1)";
  const EXIT = "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)";

  let start: { y: number; id: number } | null = null;
  let dragging = false;
  let samples: { y: number; t: number }[] = [];
  let suppress_click = false;
  let header: HTMLElement | null = $state(null);
  let scrollable = $state(false);
  // Pulled down far enough and on its way out, before the dialog is told.
  let leaving = $state(false);

  let body: HTMLElement | null = $state(null);

  $effect(() => {
    if (!body) return;
    const measure = () => (scrollable = body!.scrollHeight > body!.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    measure();
    return () => observer.disconnect();
  });

  // The page steps back while the sheet is up, and comes back as it goes,
  // whichever way it goes: pulled down, Escape, a tap outside, a choice.
  $effect(() => {
    if (sheet && open && !leaving) push_stage();
    else release_stage();
  });
  // Gone with its page (browser back with the sheet up), it hands the page
  // back at once.
  $effect(() => drop_stage);

  // Past the resting point the sheet follows less the further it goes.
  const rubberband = (overshoot: number, size: number) => (overshoot * size * 0.55) / (size + 0.55 * Math.abs(overshoot));

  const place = (offset: number) => {
    if (!sheet || !overlay) return;
    const height = sheet.offsetHeight;
    const y = offset >= 0 ? offset : rubberband(offset, height);
    sheet.style.transform = `translateY(${y}px)`;
    overlay.style.opacity = String(Math.max(0, 1 - Math.max(0, y) / height));
    follow_stage(1 - Math.max(0, y) / height);
  };

  const release_styles = () => {
    if (!sheet || !overlay) return;
    sheet.style.transform = "";
    sheet.style.transition = "";
    overlay.style.opacity = "";
    overlay.style.transition = "";
  };

  const on_down = (event: PointerEvent) => {
    // One finger drives the sheet; a second one joining mid-drag must not
    // take over.
    if (!sheet || event.button !== 0 || (dragging && start && start.id !== event.pointerId)) return;
    // A new press: whatever click a drag left to swallow is not coming. A
    // finger that moved sends none, and the press it was saved for was the
    // next real tap.
    suppress_click = false;
    if (scrollable && !header?.contains(event.target as Node)) return;
    start = { y: event.clientY, id: event.pointerId };
    samples = [{ y: event.clientY, t: event.timeStamp }];
  };

  const on_move = (event: PointerEvent) => {
    if (!start || !sheet || !overlay || event.pointerId !== start.id) return;
    const offset = event.clientY - start.y;
    if (!dragging) {
      if (Math.abs(offset) < DRAG_START) return;
      dragging = true;
      sheet.setPointerCapture(event.pointerId);
      // Lets go of whatever button the drag began on, so it does not stay pressed.
      sheet.dataset.dragging = "";
      sheet.style.transition = "none";
      overlay.style.transition = "none";
    }
    samples = [...samples.slice(-4), { y: event.clientY, t: event.timeStamp }];
    place(offset);
  };

  const on_up = (event: PointerEvent) => {
    if (!start || !sheet || event.pointerId !== start.id) return;
    const offset = event.clientY - start.y;
    start = null;
    if (!dragging) return;
    dragging = false;
    delete sheet.dataset.dragging;
    suppress_click = true;
    const first = samples[0];
    const velocity = first ? (event.clientY - first.y) / Math.max(1, event.timeStamp - first.t) : 0;
    if (offset > sheet.offsetHeight * DISMISS_FRACTION || velocity > DISMISS_VELOCITY) {
      sheet.style.transition = "";
      overlay!.style.transition = "";
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Fades out where the finger left it, rather than first jumping back.
        open = false;
        setTimeout(release_styles, 400);
        return;
      }
      // Leave from where the finger let go, in this very frame: the sheet
      // runs its own way down and tells the dialog it is closed only once it
      // is off the screen. Closing the dialog first meant waiting frames for
      // its ending style while the sheet stood still, then leaping, and the
      // dialog's clean-up (the page's scroll coming back, focus) landing on
      // the first frames of the slide.
      leaving = true;
      sheet.style.transition = EXIT;
      overlay!.style.transition = "opacity 300ms cubic-bezier(0.32, 0.72, 0, 1)";
      sheet.style.transform = "translateY(100%)";
      overlay!.style.opacity = "0";
      const target = sheet;
      let done = false;
      const gone = (event?: TransitionEvent) => {
        if (done || (event && (event.target !== target || event.propertyName !== "transform"))) return;
        done = true;
        target.removeEventListener("transitionend", gone);
        open = false;
        leaving = false;
      };
      target.addEventListener("transitionend", gone);
      // Should the transition never end (a hidden tab), close all the same.
      setTimeout(gone, 400);
    } else {
      sheet.style.transition = SNAP_BACK;
      overlay!.style.transition = "opacity 250ms cubic-bezier(0.32, 0.72, 0, 1)";
      sheet.style.transform = "";
      overlay!.style.opacity = "";
      push_stage(250);
      // The sheet's own transform, not a press animation bubbling up from a
      // button inside it.
      const settled = (event: TransitionEvent) => {
        if (event.target !== sheet || event.propertyName !== "transform") return;
        sheet!.removeEventListener("transitionend", settled);
        release_styles();
      };
      sheet.addEventListener("transitionend", settled);
    }
  };

  // A drag that started on a button must not also press it. (A mouse sends
  // that click; a finger does not, so the next press clears it.)
  const on_click_capture = (event: MouseEvent) => {
    if (!suppress_click) return;
    suppress_click = false;
    event.stopPropagation();
    event.preventDefault();
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger id={triggerId} class={triggerClass}>{@render trigger()}</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay
      bind:ref={overlay}
      class="fixed inset-0 z-50 bg-black/50 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-300 data-starting-style:opacity-0" />
    <!-- Safari colours the strip under its toolbar from whatever is fixed at
         the bottom edge. Left to the sheet, that strip is repainted frame by
         frame as the sheet rises through it, lagging the animation. This
         floor holds the edge, still and solid, while the sheet
         rises and stays. It goes the moment the sheet starts down: kept
         until the sheet is gone, Safari went on painting its toolbar grey
         over posters the sheet had already uncovered. A single line: any
         taller, it showed through the glass as a band. -->
    {#if open && !leaving}
      <div data-sheet-floor aria-hidden="true" class="bg-pick-sheet pointer-events-none fixed inset-x-0 bottom-0 z-50 h-px"></div>
    {/if}
    <!-- Rises from the edge it belongs to on the iOS sheet curve; a full-width
         sheet reads right at 500ms on that curve. It leaves faster. -->
    <Dialog.Content
      bind:ref={sheet}
      onpointerdown={on_down}
      onpointermove={on_move}
      onpointerup={on_up}
      onpointercancel={on_up}
      onclickcapture={on_click_capture}
      class="bg-pick-panel fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] touch-none flex-col rounded-t-[28px] shadow-(--pick-shadow-sheet) [backdrop-filter:var(--pick-panel-blur)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none select-none [-webkit-backdrop-filter:var(--pick-panel-blur)] data-ending-style:translate-y-full data-ending-style:duration-300 data-starting-style:translate-y-full motion-reduce:transition-opacity motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:opacity-0">
      <!-- The handle and title stay put above the list, part of the same
           glass, so nothing scrolls under them and they need no surface of
           their own. -->
      <div bind:this={header} class="shrink-0 px-5 pt-2 pb-4">
        <div aria-hidden="true" class="bg-pick-ink/20 mx-auto mb-4 h-1.5 w-10 rounded-full"></div>
        <Dialog.Title class="text-pick-ink text-lg font-semibold">{title}</Dialog.Title>
      </div>
      <div
        bind:this={body}
        data-sheet-body
        class="min-h-0 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] {scrollable
          ? 'touch-pan-y'
          : 'touch-none'}">
        {@render children()}
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global([data-dragging] button) {
    scale: none !important;
  }
</style>
