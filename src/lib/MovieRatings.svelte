<script lang="ts">
  import { rating_labels } from "#lib/accessible-labels.js";
  import type { Movie } from "#lib/schemas.js";

  type Props = {
    movie: Movie;
    desktop?: boolean;
  };

  const { movie, desktop = false }: Props = $props();
  const labels = $derived(rating_labels(movie));
  const linkClass = $derived(
    desktop
      ? "hidden -mx-1 items-center gap-1 rounded px-1 py-0.5 text-neutral-400 hover:text-white md:inline-flex"
      : "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-neutral-400 hover:text-white"
  );
</script>

{#if movie.imdb?.star}
  {#if desktop}<span class="hidden md:inline">·</span>{/if}
  <a href={movie.imdb.link} target="_blank" rel="external noopener noreferrer" aria-label={labels.imdb} class={linkClass}>
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32" width="28" height="14" class="fill-[#F5C518]">
      <rect rx="3" width="64" height="32" />
      <text x="32" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#000">IMDb</text>
    </svg>
    <span>{movie.imdb.star}</span>
  </a>
{/if}

{#if movie.rotten_tomatoes}
  {#if desktop}<span class="hidden md:inline">·</span>{/if}
  <a
    href={movie.rotten_tomatoes.url ?? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.alt_title || movie.title)}`}
    target="_blank"
    rel="external noopener noreferrer"
    aria-label={labels.rotten_tomatoes}
    class={linkClass}>
    <img src="/rotten-tomatoes.svg" alt="" width="14" height="14" />
    <span>{movie.rotten_tomatoes.score}%</span>
    {#if !desktop && movie.rotten_tomatoes.audience_score}
      <span class="text-neutral-400">({movie.rotten_tomatoes.audience_score}%)</span>
    {/if}
  </a>
{/if}

{#if movie.metacritic}
  {#if desktop}<span class="hidden md:inline">·</span>{/if}
  <a
    href={movie.metacritic.url ?? `https://www.metacritic.com/search/${encodeURIComponent(movie.alt_title || movie.title)}/`}
    target="_blank"
    rel="external noopener noreferrer"
    aria-label={labels.metacritic}
    class={linkClass}>
    <img src="/metacritic.svg" alt="" width="14" height="14" />
    <span>{movie.metacritic.score}</span>
    {#if !desktop && movie.metacritic.user_score}
      <span class="text-neutral-400">({movie.metacritic.user_score})</span>
    {/if}
  </a>
{/if}

{#if movie.letterboxd?.score}
  {#if desktop}<span class="hidden md:inline">·</span>{/if}
  <a
    href={movie.letterboxd.url ?? `https://letterboxd.com/search/${encodeURIComponent(movie.alt_title || movie.title)}/`}
    target="_blank"
    rel="external noopener noreferrer"
    aria-label={labels.letterboxd}
    class={linkClass}>
    <img src="/letterboxd.svg" alt="" width="14" height="14" />
    <span>{movie.letterboxd.score}</span>
  </a>
{/if}
