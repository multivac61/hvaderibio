<script lang="ts">
  import { SITE_URL } from "#lib/constants.js";

  type Props = {
    title: string;
    description: string;
    /** Site-relative canonical path, e.g. "/" or "/movie/dune". */
    path: string;
    image?: string;
  };

  const { title, description, path, image }: Props = $props();
  const url = $derived(`${SITE_URL}${path}`);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  {#if image}
    <meta property="og:image" content={`${SITE_URL}${image}`} />
    <meta name="twitter:image" content={`${SITE_URL}${image}`} />
  {/if}
</svelte:head>
