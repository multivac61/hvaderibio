<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";

  const { data } = $props();

  // Leaving the trailer returns to the page it was opened from, the way the
  // browser's back button would. Opened from a shared link, it goes to the
  // movie instead of off the site.
  let came_from_site = $state(false);
  afterNavigate(({ from }) => {
    came_from_site = from !== null;
  });

  const leave = (event: Event) => {
    if (!came_from_site) return;
    event.preventDefault();
    history.back();
  };

  const leave_on_escape = (event: KeyboardEvent) => {
    if (event.key === "Escape") leave(event);
  };
</script>

<svelte:window onkeydown={leave_on_escape} />

<svelte:head>
  <title>Stikla: {data.title} - Hvað er í bíó?</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<!-- One screen tall, so the player can take whatever is left below "Til
     baka": the screen less <main>'s own padding (app.html), or the page
     would scroll. -->
<div class="flex h-[calc(100dvh-1.5rem)] flex-col sm:h-[calc(100dvh-2rem)]">
  <!-- "Til baka" sits in the movie page's frame, so it does not move between
       them. -->
  <div class="container mx-auto max-w-7xl pt-4 md:px-8 md:pt-8 lg:px-12 lg:pt-10">
    <a
      href={resolve("/movie/[id]", { id: data.path })}
      onclick={leave}
      class="-mx-2 mb-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors hover:text-white md:mb-5">
      <svg aria-hidden="true" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Til baka
    </a>
  </div>
  <!-- The player is not held to that frame: it uses the window's width. -->
  <div class="player-room flex min-h-0 flex-1 justify-center pb-4 md:mt-2 md:pb-8 lg:pb-10">
    <iframe
      src="https://www.youtube.com/embed/{data.youtube_id}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
      title="Stikla: {data.title}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      class="player aspect-video self-start rounded-lg bg-neutral-900"></iframe>
  </div>
</div>

<style>
  /* The largest 16:9 player that fits: full width on a tall window, full
     height on a wide one. */
  .player-room {
    container-type: size;
  }

  .player {
    width: min(100cqw, 100cqh * 16 / 9);
  }
</style>
