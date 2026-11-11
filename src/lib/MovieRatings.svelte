<script lang="ts" module>
  /**
   * Draws a "·" in the 20px gap before an item of the movie page's meta row.
   * The row clips what lies left of it, which hides the "·" of an item that
   * wrapped to the start of a line.
   */
  export const META_SEPARATOR = "relative before:absolute before:-left-3 before:content-['·']";
</script>

<script lang="ts">
  import { rating_labels } from "#lib/accessible-labels.js";
  import type { Movie } from "#lib/schemas.js";

  type Props = {
    movie: Movie;
    desktop?: boolean;
  };

  const { movie, desktop = false }: Props = $props();
  const labels = $derived(rating_labels(movie));
  // On desktop each rating follows the year, length and genres on one row.
  const groupClass = $derived(desktop ? `hidden items-center md:inline-flex ${META_SEPARATOR}` : "contents");
  const linkClass = "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-neutral-400 hover:text-white";
</script>

{#if movie.imdb?.star}
  <span class={groupClass}>
    <a href={movie.imdb.link} target="_blank" rel="external noopener noreferrer" aria-label={labels.imdb} class={linkClass}>
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32" width="28" height="14" class="fill-[#F5C518]">
        <rect rx="3" width="64" height="32" />
        <text x="32" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#000">IMDb</text>
      </svg>
      <span>{movie.imdb.star}</span>
    </a>
  </span>
{/if}

{#if movie.rotten_tomatoes}
  <span class={groupClass}>
    <a
      href={movie.rotten_tomatoes.url ?? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.title)}`}
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
  </span>
{/if}

{#if movie.metacritic}
  <span class={groupClass}>
    <a
      href={movie.metacritic.url ?? `https://www.metacritic.com/search/${encodeURIComponent(movie.title)}/`}
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
  </span>
{/if}

{#if movie.letterboxd?.score}
  <span class={groupClass}>
    <a
      href={movie.letterboxd.url ?? `https://letterboxd.com/search/${encodeURIComponent(movie.title)}/`}
      target="_blank"
      rel="external noopener noreferrer"
      aria-label={labels.letterboxd}
      class={linkClass}>
      <img src="/letterboxd.svg" alt="" width="14" height="14" />
      <span>{movie.letterboxd.score}</span>
    </a>
  </span>
{/if}
