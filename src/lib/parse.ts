import { gunzipSync } from "node:zlib";
import { movie_details_schema, type Movie, type MovieDetails, type ShowtimesByDay, type Showtime } from "#lib/schemas.js";

export type { MovieDetails };
import { fetch_text } from "#lib/http.js";

const pad = (n: number) => n.toString().padStart(2, "0");

// Parse Icelandic premiere date like "19.  mars  2026" into a YYYY-MM-DD date
function parse_premiere_date(text: string): string | null {
  const months: Record<string, number> = {
    janúar: 0,
    febrúar: 1,
    mars: 2,
    apríl: 3,
    maí: 4,
    júní: 5,
    júlí: 6,
    ágúst: 7,
    september: 8,
    október: 9,
    nóvember: 10,
    desember: 11,
  };
  // Match patterns like "19.  mars  2026" or "19. mars 2026"
  const match = text.match(/(\d{1,2})\.\s*(\S+)\s+(\d{4})/);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = months[monthName.toLowerCase()];
  if (month === undefined) return null;
  return `${year}-${pad(month + 1)}-${pad(parseInt(day))}`;
}

export function parse_movie_details(document: Document, id: number): MovieDetails | null {
  // New structure uses mp-hero classes
  const heroTitle = document.querySelector<HTMLHeadingElement>("h1.mp-hero__title");
  const title = heroTitle?.childNodes[0]?.textContent?.trim();

  // Year is in span inside h1 or in mp-hero__year
  const yearText = document.querySelector<HTMLSpanElement>("span.mp-hero__year")?.textContent?.trim();
  const release_year = parseInt(yearText?.replace(/[()]/g, "") ?? "0");

  // Poster URL from hero section
  const posterImg = document.querySelector<HTMLImageElement>("div.mp-hero__poster img");
  const poster_url = posterImg?.src;

  // Description from plot section (mp-plot > p), fallback to tagline
  const plotDescription = document.querySelector<HTMLParagraphElement>("div.mp-plot p")?.textContent?.trim();
  const taglineDescription = document.querySelector<HTMLParagraphElement>("p.mp-hero__tagline")?.textContent?.trim();
  const description = plotDescription || taglineDescription || "";

  // Genres
  const genres = [...document.querySelectorAll<HTMLAnchorElement>("a.mp-genres__tag")].map((a) => a.textContent?.trim() ?? "");

  // Duration - format is "X klst Y mín" or just "Y mín"
  const runtimeText = document.querySelector<HTMLSpanElement>("span.mp-hero__runtime")?.textContent?.trim() ?? "";
  let duration_in_mins = 0;
  const hoursMatch = runtimeText.match(/(\d+)\s*klst/);
  const minsMatch = runtimeText.match(/(\d+)\s*mín/);
  if (hoursMatch) duration_in_mins += parseInt(hoursMatch[1]) * 60;
  if (minsMatch) duration_in_mins += parseInt(minsMatch[1]);

  // Trailer URL from JSON-LD structured data
  let trailer_url: string | undefined;
  const jsonLdScript = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
  if (jsonLdScript?.textContent) {
    try {
      const jsonLd = JSON.parse(jsonLdScript.textContent);
      if (jsonLd.trailer?.embedUrl) {
        // Convert embed URL to watch URL for consistency
        const embedUrl = jsonLd.trailer.embedUrl;
        const videoId = embedUrl.match(/embed\/([^?&/]+)/)?.[1];
        trailer_url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : embedUrl;
      }
    } catch {
      // JSON parse failed, trailer will be undefined
    }
  }

  // Ratings from hero section
  let imdb: { link: string; star?: number } | undefined;
  let rotten_tomatoes: { score: number } | undefined;
  let metacritic: { score: number } | undefined;

  document.querySelectorAll<HTMLDivElement>("div.mp-hero__rating-item").forEach((item) => {
    const img = item.querySelector("img");
    const scoreEl = item.querySelector<HTMLSpanElement>("span.mp-hero__rating-score");
    const scoreText = scoreEl?.textContent?.trim() ?? "";
    const link = item.querySelector<HTMLAnchorElement>("a")?.href;

    if (img?.alt?.toLowerCase().includes("imdb")) {
      const star = parseFloat(scoreText);
      if (link) {
        imdb = Number.isFinite(star) && star > 0 ? { link, star } : { link };
      }
    } else if (img?.alt?.toLowerCase().includes("rotten")) {
      const score = parseInt(scoreText.replace("%", ""));
      if (Number.isFinite(score) && score > 0) {
        rotten_tomatoes = { score };
      }
    } else if (img?.alt?.toLowerCase().includes("metacritic")) {
      const score = parseInt(scoreText);
      if (Number.isFinite(score) && score > 0) {
        metacritic = { score };
      }
    }
  });

  // Also check external links section for IMDb if not found in ratings
  if (!imdb) {
    const imdbLink = document.querySelector<HTMLAnchorElement>("a.mp-external-links__item[href*='imdb.com']");
    if (imdbLink) {
      imdb = { link: imdbLink.href };
    }
  }

  // Movies with an announced premiere can already have hidden preview
  // screenings listed; assemble_movie filters those.
  const premiereDateText = document.querySelector<HTMLSpanElement>("span.mp-hero__premiere-date")?.textContent?.trim();
  const premiereLabel = document.querySelector<HTMLSpanElement>("span.mp-hero__premiere-label")?.textContent?.trim();
  const premiere_date = premiereDateText && premiereLabel?.includes("Væntanleg") ? parse_premiere_date(premiereDateText) : null;

  const parsed = movie_details_schema.safeParse({
    title,
    release_year,
    poster_url,
    description,
    genres,
    duration_in_mins,
    trailer_url,
    id,
    imdb,
    rotten_tomatoes,
    metacritic,
    premiere_date: premiere_date ?? undefined,
  });

  if (!parsed.success) {
    console.error(`Failed to parse movie ${id}:`, parsed.error.issues);
    return null;
  }
  return parsed.data;
}

// Smárabíó lists preview screenings before a movie's premiere that are not
// on general sale.
const HIDDEN_PREVIEW_CINEMAS = ["Smárabíó"];

/** Combine cached details with the current listings into a movie, or null if nothing is showing. */
export function assemble_movie(details: MovieDetails, showtimes_by_day: ShowtimesByDay, today: string): Movie | null {
  const { premiere_date, ...movie } = details;
  const hide_previews = premiere_date !== undefined && premiere_date > today;

  const visible: ShowtimesByDay = {};
  for (const [day, cinemas] of Object.entries(showtimes_by_day)) {
    const kept = Object.entries(cinemas).filter(([cinema]) => !(hide_previews && HIDDEN_PREVIEW_CINEMAS.includes(cinema)));
    if (kept.length > 0) visible[day] = Object.fromEntries(kept);
  }

  return Object.keys(visible).length > 0 ? { ...movie, showtimes_by_day: visible } : null;
}

export function parse_movie_ids(document: Document): number[] {
  return [...document.querySelectorAll<HTMLAnchorElement>("a.movie_title")]
    .map((a) => {
      const match = a?.href?.match(/\d+/g);
      return match ? parseInt(match[0]) : null;
    })
    .filter((id): id is number => id !== null);
}

// One showtime link from /bio/syningatimar/, e.g.
// <a class="st-showtime-link" data-movie-id="18822" data-cinema="Smárabíó"
//    data-showtime="2026-10-03 13:00:00">13:00 <div class="tegund">ÍSL TAL</div><div class="salur">MAX</div></a>
function listing_showtime(link: HTMLAnchorElement): Showtime {
  const hall = link.querySelector<HTMLDivElement>("div.salur")?.textContent?.trim() ?? "";
  const language = link.querySelector<HTMLDivElement>("div.tegund")?.textContent?.toUpperCase() ?? "";
  const label = hall.toUpperCase();
  const [date, clock] = (link.dataset.showtime ?? "").split(" ");

  return {
    // Iceland is on UTC+0 all year, so the listed wall-clock time is the UTC time.
    time: `${date}T${clock.slice(0, 5)}:00.000Z`,
    purchase_url: link.href,
    hall,
    is_icelandic: language.includes("ÍSL TAL") || language.includes("ÍSL.TAL") || undefined,
    is_3d: link.textContent?.toUpperCase().includes("3D") || undefined,
    is_luxus: label.includes("LÚXUS") || label.includes("LUX") || undefined,
    is_vip: label.includes("VIP") || undefined,
    is_atmos: label.includes("ÁSBERG") || label.includes("ATMOS") || undefined,
    is_max: label.includes("MAX") || undefined,
    is_flauel: label.includes("FLAUEL") || undefined,
  };
}

/**
 * Read the showtimes listing for each day (documents[N] is ?dagur=N). It is
 * the only index of which movies are showing and carries every showtime with
 * its hall and format labels, so movie pages are needed only for details.
 */
export function parse_listings(documents: readonly Document[]): { movieIds: number[]; showtimes: Map<number, ShowtimesByDay> } {
  const showtimes = new Map<number, ShowtimesByDay>();

  documents.forEach((document, day) => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>("a.st-showtime-link")) {
      const id = Number(link.dataset.movieId);
      const cinema = link.dataset.cinema;
      if (!Number.isInteger(id) || !cinema || !link.dataset.showtime) continue;

      const by_day = showtimes.get(id) ?? {};
      const cinemas = (by_day[day] ??= {});
      (cinemas[cinema] ??= []).push(listing_showtime(link));
      showtimes.set(id, by_day);
    }
  });

  return { movieIds: [...new Set(documents.flatMap(parse_movie_ids))], showtimes };
}

export type ImdbRating = { star: number };

// Read IMDb ratings from IMDb's public dataset. This avoids relying on the
// kvikmyndir.is rating widget, which can be stale or missing and previously
// caused us to persist placeholder 0 ratings from IMDb links. Ratings are an
// optional extra, so an unavailable dataset yields no ratings rather than
// blocking the deploy; callers fall back to the kvikmyndir.is rating.
async function download_imdb_dataset(dataset_url: string): Promise<string | null> {
  try {
    const response = await fetch(dataset_url, { headers: { "User-Agent": "hvaderibio/1.0" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return new TextDecoder().decode(gunzipSync(await response.arrayBuffer()));
  } catch (error) {
    console.error("Skipping IMDb ratings, dataset unavailable:", error);
    return null;
  }
}

/**
 * Start downloading the ratings dataset now and return a lookup that waits
 * for it. The download does not depend on which movies are showing, so it
 * can overlap with scraping them.
 */
export function prefetch_imdb_ratings(dataset_url = "https://datasets.imdbws.com/title.ratings.tsv.gz") {
  const dataset = download_imdb_dataset(dataset_url);

  return async (imdbIds: readonly string[]): Promise<Map<string, ImdbRating>> => {
    const ids = new Set(imdbIds);
    const ratings = new Map<string, ImdbRating>();
    const tsv = await dataset;
    if (!tsv) return ratings;

    for (const line of tsv.split("\n").slice(1)) {
      if (ratings.size === ids.size) break;

      const [id, averageRating] = line.split("\t");
      if (!ids.has(id)) continue;

      const star = parseFloat(averageRating);
      if (Number.isFinite(star) && star > 0) {
        ratings.set(id, { star });
      }
    }

    return ratings;
  };
}

export type ExternalUrls = { rtUrl?: string; mcUrl?: string; letterboxdUrl?: string };

type WikidataBinding = Partial<Record<"imdb" | "rtId" | "mcId" | "lbId", { value: string }>>;

export function parse_external_urls(response: { results?: { bindings?: WikidataBinding[] } }): Map<string, ExternalUrls> {
  const urls = new Map<string, ExternalUrls>();
  for (const { imdb, rtId, mcId, lbId } of response.results?.bindings ?? []) {
    // An item with several ids for one site yields several rows; keep the first.
    if (!imdb || urls.has(imdb.value)) continue;
    urls.set(imdb.value, {
      rtUrl: rtId ? `https://www.rottentomatoes.com/${rtId.value}` : undefined,
      mcUrl: mcId ? `https://www.metacritic.com/${mcId.value}` : undefined,
      letterboxdUrl: lbId ? `https://letterboxd.com/film/${lbId.value}/` : undefined,
    });
  }
  return urls;
}

// Look up RT, Metacritic, and Letterboxd ids for every movie in one Wikidata
// query; the query service throttles parallel requests per client.
export async function fetch_external_urls(imdbIds: readonly string[]): Promise<Map<string, ExternalUrls>> {
  if (imdbIds.length === 0) return new Map();
  const sparql = `
    SELECT ?imdb ?rtId ?mcId ?lbId WHERE {
      VALUES ?imdb { ${imdbIds.map((id) => JSON.stringify(id)).join(" ")} }
      ?movie wdt:P345 ?imdb .
      OPTIONAL { ?movie wdt:P1258 ?rtId . }
      OPTIONAL { ?movie wdt:P1712 ?mcId . }
      OPTIONAL { ?movie wdt:P6127 ?lbId . }
    }`;

  try {
    const body = await fetch_text("https://query.wikidata.org/sparql?" + new URLSearchParams({ query: sparql, format: "json" }), {
      headers: { "User-Agent": "hvaderibio/1.0" },
    });
    return parse_external_urls(JSON.parse(body));
  } catch (error) {
    console.error("Failed to fetch external URLs from Wikidata:", error);
    return new Map();
  }
}

const browser_headers = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

// Rating sites publish schema.org JSON-LD, which is far steadier than their
// markup. Letterboxd wraps it in /* <![CDATA[ */ comments.
function json_ld_rating(html: string): number | undefined {
  for (const [, body] of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const rating = parseFloat(JSON.parse(body.replace(/\/\*[\s\S]*?\*\//g, ""))?.aggregateRating?.ratingValue);
      if (Number.isFinite(rating)) return rating;
    } catch {
      // Not valid JSON; try the next block.
    }
  }
}

const parse_int = (text: string | undefined) => (text === undefined ? undefined : parseInt(text));

export function parse_rotten_tomatoes_scores(html: string): { score: number; audience_score?: number } | null {
  // The Tomatometer is already a percentage, even when below 10.
  const score = json_ld_rating(html);
  if (score === undefined) return null;

  const audience_score = parse_int(html.match(/"audienceScore":\{[^}]*?"score":"(\d+)"/)?.[1]);
  return { score: Math.round(score), audience_score };
}

export function parse_metacritic_scores(html: string): { score: number; user_score?: number } | null {
  const score = json_ld_rating(html);
  if (score === undefined) return null;

  // The user score (0-10) only appears in the rendered score panel; the page's
  // data payload uses indices that look like scores.
  const user_score = html.match(/global-score-header">User score<[\s\S]*?global-score-value">([\d.]+)</i)?.[1];
  return { score: Math.round(score), user_score: user_score === undefined ? undefined : Math.round(parseFloat(user_score) * 10) };
}

export function parse_letterboxd_score(html: string): { score: number } | null {
  // Letterboxd's native 0-5 scale, to one decimal.
  const rating = json_ld_rating(html);
  return rating === undefined ? null : { score: Math.round(rating * 10) / 10 };
}

async function scrape<T>(url: string, parse: (html: string) => T | null, label: string): Promise<T | null> {
  try {
    return parse(await fetch_text(url, { headers: browser_headers }));
  } catch (error) {
    console.error(`Failed to scrape ${label} from ${url}:`, error);
    return null;
  }
}

export const scrape_rotten_tomatoes = (url: string) => scrape(url, parse_rotten_tomatoes_scores, "RT scores");
export const scrape_metacritic = (url: string) => scrape(url, parse_metacritic_scores, "MC scores");
export const scrape_letterboxd = (url: string) => scrape(url, parse_letterboxd_score, "Letterboxd score");
