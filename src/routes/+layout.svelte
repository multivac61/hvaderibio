<script lang="ts">
  import "../app.css";
  import { onNavigate } from "$app/navigation";
  import { track_input_modality } from "#lib/input-modality.js";

  let { children } = $props();

  $effect(track_input_modality);

  // Detect mobile devices to disable view transitions (Safari butchers them)
  const isMobile = () => {
    if (typeof window === "undefined") return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  };

  onNavigate((navigation) => {
    if (!document.startViewTransition || isMobile()) return;
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
