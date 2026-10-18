<script lang="ts">
  import "../app.css";
  import { onNavigate } from "$app/navigation";
  import { track_input_modality } from "#lib/input-modality.js";
  import { can_view_transition } from "#lib/view-transition.js";

  let { children } = $props();

  $effect(track_input_modality);

  onNavigate((navigation) => {
    if (!can_view_transition()) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<svelte:head>
  <!-- DNS prefetch for cinema ticket purchase domains -->
  <link rel="dns-prefetch" href="https://www.sambio.is" />
  <link rel="dns-prefetch" href="https://eu.internet-ticketing.com" />
  <link rel="dns-prefetch" href="https://www.bioparadis.is" />
  <link rel="dns-prefetch" href="https://www.smarabio.is" />
</svelte:head>

{@render children()}
