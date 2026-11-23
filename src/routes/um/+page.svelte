<script lang="ts">
  import { resolve } from "$app/paths";
  import PageMeta from "#lib/PageMeta.svelte";

  // Links are written without their scheme, which the markup adds: all go
  // off the site. The archive ones show the site's earlier faces as the
  // Wayback Machine kept them.
  const archive = (stamp: string, label: string) => ({ to: `web.archive.org/web/${stamp}/https://hvaderibio.is/`, label });

  // Links in a warm grey rather than white, which read cold against the
  // body text; they brighten under the pointer.
  const link_class =
    "text-stone-200 underline decoration-stone-500/60 underline-offset-4 transition-colors hover:text-white hover:decoration-stone-300";

  // Newest first: the site as it is now, then back to where it began. Each
  // entry's text is a snippet, below, so a name in it can link.
  const history = [
    {
      year: "Í dag",
      title: "Opinn hugbúnaður",
      text: today,
      links: [{ to: "github.com/multivac61/hvaderibio", label: "Kóðinn á GitHub" }],
    },
    {
      year: "2023",
      title: "Ný síða",
      text: new_site,
      links: [archive("20230316003750", "Síðan árið 2023"), archive("20250120162633", "Síðan árið 2025")],
    },
    {
      year: "2013",
      title: "Fyrsta útgáfan",
      text: first_version,
      links: [
        { to: "github.com/hugihlynsson/hvad-er-i-bio", label: "Kóðinn á GitHub" },
        archive("20140211164019", "Síðan árið 2014"),
        archive("20210121211204", "Síðan árið 2021"),
      ],
    },
  ];
</script>

<!-- The maintainer's name opens an email to the maintainer. -->
{#snippet olafur()}<a href="mailto:olafurbjarki@gmail.com" class={link_class}>Ólafur Bjarki</a>{/snippet}

{#snippet first_version()}
  <a href="https://hugihlynsson.com/" class={link_class}>Hugi Hlynsson</a> smíðar Hvað er í bíó?, einfalt yfirlit yfir sýningar kvöldsins með
  gögnum frá kvikmyndir.is í gegnum apis.is.
{/snippet}
{#snippet new_site()}
  {@render olafur()} skrifar síðuna upp á nýtt frá grunni, innblásinn af síðu Huga, og sækir sýningartímana á kvikmyndir.is á hverjum degi.
{/snippet}
{#snippet today()}
  Síðan er enn í smíðum. Allur kóðinn er opinn og ábendingar eru vel þegnar.
  <a href="https://www.solberg.is/" class={link_class}>Jökull Sólberg</a> veitti ómetanlega endurgjöf á hönnun og virkni síðunnar.
{/snippet}

<PageMeta
  title="Um síðuna - Hvað er í bíó?"
  description="Hvað er í bíó? er ástríðuverkefni og opinn hugbúnaður, gert fyrir alla sem vilja sjá góðar bíómyndir."
  path="/um" />

<article class="mx-auto max-w-2xl py-6 sm:py-12">
  <a
    href={resolve("/")}
    class="relative -mx-2 mb-8 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors before:absolute before:-inset-2 hover:text-white">
    <svg aria-hidden="true" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
    Dagskráin
  </a>

  <h1 class="text-4xl tracking-tight text-white sm:text-5xl" style="font-family: 'Space Grotesk', sans-serif;">Hvað er í bíó?</h1>
  <p class="mt-5 text-lg text-pretty text-neutral-300">Fljótlegt yfirlit yfir bíódagskrá á öllu landinu.</p>
  <p class="mt-4 text-lg text-pretty text-neutral-300">
    {@render olafur()} heldur síðunni við: hún er ástríðuverkefni,
    <a href="https://github.com/multivac61/hvaderibio" class={link_class}>opinn hugbúnaður</a>, og gerð fyrir alla Íslendinga sem vilja
    njóta þess að upplifa bíó.
  </p>

  <h2 class="mt-14 text-sm font-medium text-neutral-400">Sagan</h2>
  <ol class="mt-5 border-l border-white/10">
    {#each history as entry (entry.year)}
      <li class="relative pb-10 pl-6 last:pb-0">
        <span aria-hidden="true" class="absolute top-2 -left-[4.5px] size-2 rounded-full bg-white"></span>
        <p class="text-sm text-neutral-400">{entry.year}</p>
        <h3 class="mt-1 text-lg font-semibold text-white">{entry.title}</h3>
        <p class="mt-2 text-pretty text-neutral-300">{@render entry.text()}</p>
        <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {#each entry.links as link (link.to)}
            <li>
              <a href="https://{link.to}" class={link_class}>{link.label}</a>
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ol>
</article>

<style>
  /* Subset by Google Fonts to "Hvað er í bíó?"; see static/fonts/OFL.txt. */
  @font-face {
    font-family: "Space Grotesk";
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url("/fonts/space-grotesk-500-heading.woff2") format("woff2");
    unicode-range: U+20, U+3f, U+48, U+61-62, U+65, U+69, U+6f, U+72, U+76, U+e1, U+e9, U+ed, U+f0, U+f3, U+155, U+301;
  }
</style>
