<script lang="ts">
  import "../app.css";
  import { afterNavigate, onNavigate, preloadData } from "$app/navigation";
  import { onMount } from "svelte";
  import { app } from "#lib/app-state.js";
  import { track_input_modality } from "#lib/input-modality.js";

  let { children } = $props();

  $effect(track_input_modality);

  // The layout mounts after the first page, once hydration is done.
  onMount(() => {
    app.hydrated = true;
  });

  // Detect mobile devices to disable view transitions (Safari butchers them)
  const isMobile = () => {
    if (typeof window === "undefined") return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  };

  // An edge swipe in iOS Safari animates to a screenshot of the previous
  // page, then waits for SvelteKit to load it, showing the page being left
  // again for a network round trip. Preload the page the visitor came from,
  // so swiping back (or forward again) renders at once.
  afterNavigate(({ from }) => {
    if (from) void preloadData(from.url.href);
  });

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
  <!-- Movie pages show the trailer thumbnail first on phones. Connecting here,
       before a poster is tapped, saves the handshake on arrival. -->
  <link rel="preconnect" href="https://img.youtube.com" />
  <!-- DNS prefetch for cinema ticket purchase domains -->
  <link rel="dns-prefetch" href="https://www.sambio.is" />
  <link rel="dns-prefetch" href="https://eu.internet-ticketing.com" />
  <link rel="dns-prefetch" href="https://www.bioparadis.is" />
  <link rel="dns-prefetch" href="https://www.smarabio.is" />
</svelte:head>

{@render children()}
