<script lang="ts">
  import "../app.css";
  import { onNavigate } from "$app/navigation";

  let { children } = $props();

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<svelte:head>
  <!-- Preconnect to external domains for faster loading -->
  <link rel="preconnect" href="https://www.youtube.com" />
  <link rel="preconnect" href="https://img.youtube.com" />
  <link rel="preconnect" href="https://cdn.usefathom.com" />
  <!-- DNS prefetch for cinema ticket purchase domains -->
  <link rel="dns-prefetch" href="https://www.sambio.is" />
  <link rel="dns-prefetch" href="https://eu.internet-ticketing.com" />
  <link rel="dns-prefetch" href="https://www.bioparadis.is" />
  <link rel="dns-prefetch" href="https://www.smarabio.is" />
</svelte:head>

{@render children()}
