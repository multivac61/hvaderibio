<script lang="ts">
  import { page } from "$app/state";

  const status = $derived(page.status);

  const title = $derived(status === 404 ? "Síða fannst ekki" : status === 500 ? "Villa kom upp" : "Villa kom upp");

  const description = $derived(
    status === 404 ? "Þessi síða er ekki til. Kannski viltu fara aftur á forsíðuna?" : "Eitthvað fór úrskeiðis. Vinsamlegast reyndu aftur."
  );
</script>

<svelte:head>
  <title>{title} - Hvað er í bíó?</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-black text-neutral-100">
  <div class="max-w-md px-4 text-center">
    <!-- Animated film reel -->
    <div class="mb-6 flex justify-center">
      <svg class="h-24 w-24 text-neutral-600" style="animation: spin 4s linear infinite;" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <circle cx="12" cy="5" r="1.5" fill="currentColor" />
        <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        <circle cx="5" cy="12" r="1.5" fill="currentColor" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" />
        <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
        <circle cx="16.5" cy="16.5" r="1.5" fill="currentColor" />
        <circle cx="16.5" cy="7.5" r="1.5" fill="currentColor" />
        <circle cx="7.5" cy="16.5" r="1.5" fill="currentColor" />
      </svg>
    </div>
    <style>
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    </style>
    <h1 class="mb-4 text-6xl font-bold text-neutral-400">{status}</h1>
    <h2 class="mb-2 text-2xl font-bold">{title}</h2>
    <p class="mb-2 text-neutral-400">{description}</p>
    <div class="mb-8"></div>
    <button
      type="button"
      onclick={() => (window.location.href = "/")}
      class="group relative inline-flex items-center gap-2 rounded-md bg-linear-to-br from-neutral-800 to-neutral-900 px-4 py-2 text-base text-neutral-300 transition-all duration-200 ease-out hover:bg-neutral-700 hover:text-white">
      <span
        class="absolute inset-0 rounded-md opacity-5 shadow-[inset_0_1px_1px_white] transition-opacity duration-200 group-hover:opacity-10"
      ></span>
      <svg class="relative h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span class="relative">Til baka á forsíðu</span>
    </button>
  </div>
</div>
