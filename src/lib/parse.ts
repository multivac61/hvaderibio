import { movie_schema, cinema_showtimes_schema, type CinemaShowtimes, type ShowtimesByDay } from "./schemas";
import { DAYS_SHOWN } from "./constants";
import { fetch_text } from "./http";
import { reykjavik_date, reykjavik_date_after } from "./reykjavik";

const pad = (n: number) => n.toString().padStart(2, "0");

// Iceland is on UTC+0 all year, so a Reykjavik wall-clock time is that UTC time.
function combineDateWithTime(hour_minute: string, dayOffset: number = 0): string {
  // Handle both "15:10" and "15.10" formats
  const [hours, minutes = "0"] = hour_minute.replace(".", ":").split(":");
  return `${reykjavik_date_after(new Date(), dayOffset)}T${pad(parseInt(hours))}:${pad(parseInt(minutes))}:00.000Z`;
}

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

export function parse_movie(document: Document, id: number) {
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

  // Check for premiere date badge ("Væntanleg í bíó: DD. month YYYY")
  // If premiere is in the future, this movie has hidden preview screenings
  const premiereDateText = document.querySelector<HTMLSpanElement>("span.mp-hero__premiere-date")?.textContent?.trim();
  const premiereLabel = document.querySelector<HTMLSpanElement>("span.mp-hero__premiere-label")?.textContent?.trim();
  let has_future_premiere = false;
  if (premiereDateText && premiereLabel?.includes("Væntanleg")) {
    const premiereDate = parse_premiere_date(premiereDateText);
    if (premiereDate) {
      has_future_premiere = premiereDate > reykjavik_date(new Date());
      if (has_future_premiere) {
        console.log(`  Movie "${title}" (${id}) has future premiere: ${premiereDateText} - filtering Smárabíó preview showtimes`);
      }
    }
  }

  // Parse showtimes, filtering out Smárabíó hidden preview screenings
  const raw_showtimes = parse_showtimes_by_day(document);
  const showtimes_by_day = has_future_premiere ? filter_hidden_showtimes(raw_showtimes, ["Smárabíó"]) : raw_showtimes;

  const parsed = movie_schema.safeParse({
    title,
    alt_title: undefined, // Alt title not visible in new design
    release_year,
    poster_url,
    rating_urls: [],
    content_rating: undefined,
    description,
    genres,
    duration_in_mins,
    language: [],
    showtimes_by_day,
    trailer_url,
    id,
    imdb,
    rotten_tomatoes,
    metacritic,
  });

  if (!parsed.success) {
    console.error(`Failed to parse movie ${id}:`, parsed.error.issues);
  }
  return parsed.success ? parsed.data : null;
}

function parse_showtimes_for_day(document: Document, dayIndex: number): CinemaShowtimes {
  const cinema_showtimes: CinemaShowtimes = {};

  // New structure: div.mp-showtimes__day[data-date="X"] contains cinemas
  const dayContainer = document.querySelector<HTMLDivElement>(`div.mp-showtimes__day[data-date="${dayIndex}"]`);
  if (!dayContainer) return cinema_showtimes;

  dayContainer.querySelectorAll<HTMLDivElement>("div.mp-showtimes__cinema").forEach((cinema) => {
    const cinema_name = cinema.querySelector<HTMLSpanElement>("span.mp-showtimes__cinema-name")?.textContent?.trim() ?? "";
    if (!cinema_name) return;

    const showtimes = [...cinema.querySelectorAll<HTMLAnchorElement>("a.mp-showtimes__time")].map((showtime) => {
      const timeText = showtime.querySelector<HTMLSpanElement>("span.mp-showtimes__time-value")?.textContent?.trim() ?? "";
      const purchase_url = showtime.href ?? "";

      // Check for Icelandic language indicator (new structure uses separate span)
      const hasLangSpan = showtime.querySelector("span.mp-showtimes__time-lang--is") !== null;
      const showtimeText = showtime.textContent?.toUpperCase() ?? "";
      const is_icelandic = hasLangSpan || showtimeText.includes("ÍSL");

      // Check for special format types (3D, LÚX, ÁSBERG, etc.)
      const typeSpan = showtime.querySelector<HTMLSpanElement>("span.mp-showtimes__time-type");
      const typeText = typeSpan?.textContent?.toUpperCase() ?? "";

      const is_3d = typeText.includes("3D") || showtimeText.includes("3D");
      const is_luxus = typeText.includes("LÚX") || typeText.includes("LUXUS") || showtimeText.includes("LÚX");
      const is_vip = typeText.includes("VIP") || showtimeText.includes("VIP");
      const is_atmos = typeText.includes("ÁSBERG") || typeText.includes("ATMOS") || showtimeText.includes("ÁSBERG");
      const is_max = typeText.includes("MAX") || showtimeText.includes("MAX");
      const is_flauel = typeText.includes("FLAUEL") || showtimeText.includes("FLAUEL");

      return {
        time: combineDateWithTime(timeText, dayIndex),
        purchase_url,
        hall: "",
        is_icelandic: is_icelandic || undefined,
        is_3d: is_3d || undefined,
        is_luxus: is_luxus || undefined,
        is_vip: is_vip || undefined,
        is_atmos: is_atmos || undefined,
        is_max: is_max || undefined,
        is_flauel: is_flauel || undefined,
      };
    });

    if (showtimes.length > 0) {
      cinema_showtimes[cinema_name] = showtimes;
    }
  });

  return cinema_showtimes_schema.parse(cinema_showtimes);
}

// Filter out showtimes for specific cinemas (used for hidden preview screenings)
function filter_hidden_showtimes(showtimes_by_day: ShowtimesByDay, cinemas_to_filter: string[]): ShowtimesByDay {
  const filtered: ShowtimesByDay = {};
  for (const [day, cinema_showtimes] of Object.entries(showtimes_by_day)) {
    const filtered_cinemas: Record<string, (typeof cinema_showtimes)[string]> = {};
    for (const [cinema_name, showtimes] of Object.entries(cinema_showtimes)) {
      if (!cinemas_to_filter.includes(cinema_name)) {
        filtered_cinemas[cinema_name] = showtimes;
      }
    }
    if (Object.keys(filtered_cinemas).length > 0) {
      filtered[day] = filtered_cinemas;
    }
  }
  return filtered;
}

export function parse_showtimes_by_day(document: Document): ShowtimesByDay {
  const showtimes_by_day: ShowtimesByDay = {};

  for (let day = 0; day < DAYS_SHOWN; day++) {
    const day_showtimes = parse_showtimes_for_day(document, day);
    // Only include days that have showtimes
    if (Object.keys(day_showtimes).length > 0) {
      showtimes_by_day[day.toString()] = day_showtimes;
    }
  }

  return showtimes_by_day;
}

// Function to extract direct cinema URL from redirect page
export async function extract_direct_url(redirect_url: string): Promise<string> {
  try {
    const response = await fetch(redirect_url);
    const html = await response.text();

    // Look for the window.location.href pattern in the JavaScript
    const match = html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
    if (match && match[1]) {
      return match[1];
    }

    // Fallback: look for meta refresh
    const metaMatch = html.match(/<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^;]*;\s*url\s*=\s*([^"']+)["']/i);
    if (metaMatch && metaMatch[1]) {
      return metaMatch[1];
    }

    // If no direct URL found, return the original redirect URL
    return redirect_url;
  } catch (error) {
    console.error(`Failed to extract direct URL from ${redirect_url}:`, error);
    return redirect_url;
  }
}

export function parse_movie_ids(document: Document): number[] {
  return [...document.querySelectorAll<HTMLAnchorElement>("a.movie_title")]
    .map((a) => {
      const match = a?.href?.match(/\d+/g);
      return match ? parseInt(match[0]) : null;
    })
    .filter((id): id is number => id !== null);
}

// Parse hall info from the showtimes listing page (/bio/syningatimar/)
// Returns a map of purchase_url -> hall attributes
export interface HallInfo {
  hall: string;
  is_icelandic?: boolean;
  is_luxus?: boolean;
  is_vip?: boolean;
  is_atmos?: boolean;
  is_max?: boolean;
  is_flauel?: boolean;
  is_3d?: boolean;
}

/**
 * Merge the showtimes listing for each day. The listing is the only source
 * of hall names and most format labels, and the only index of which movies
 * are showing, so every day the site offers must be read, not just today.
 */
export function parse_listings(documents: readonly Document[]): { movieIds: number[]; hallInfo: Map<string, HallInfo> } {
  return {
    movieIds: [...new Set(documents.flatMap(parse_movie_ids))],
    hallInfo: new Map(documents.flatMap((document) => [...parse_hall_info_from_listing(document)])),
  };
}

export function parse_hall_info_from_listing(document: Document): Map<string, HallInfo> {
  const hallInfoMap = new Map<string, HallInfo>();

  // Find all showtime links in the listing page
  document.querySelectorAll<HTMLAnchorElement>("a.rate.tooltip").forEach((link) => {
    const href = link.href;
    if (!href) return;

    // Extract hall name from <div class="salur">
    const salurDiv = link.querySelector<HTMLDivElement>("div.salur");
    const hall = salurDiv?.textContent?.trim() ?? "";

    // Extract language info from <div class="tegund">
    const tegundDiv = link.querySelector<HTMLDivElement>("div.tegund");
    const tegundText = tegundDiv?.textContent?.toUpperCase() ?? "";
    const is_icelandic = tegundText.includes("ÍSL TAL") || tegundText.includes("ÍSL.TAL");

    // Check link text for 3D
    const linkText = link.textContent?.toUpperCase() ?? "";
    const is_3d = linkText.includes("3D");

    // Determine special formats based on hall name
    const hallUpper = hall.toUpperCase();
    const is_luxus = hallUpper.includes("LÚXUS") || hallUpper.includes("LUX");
    const is_vip = hallUpper.includes("VIP");
    const is_atmos = hallUpper.includes("ÁSBERG") || hallUpper.includes("ATMOS");
    const is_max = hallUpper.includes("MAX");
    const is_flauel = hallUpper.includes("FLAUEL");

    hallInfoMap.set(href, {
      hall,
      is_icelandic: is_icelandic || undefined,
      is_luxus: is_luxus || undefined,
      is_vip: is_vip || undefined,
      is_atmos: is_atmos || undefined,
      is_max: is_max || undefined,
      is_flauel: is_flauel || undefined,
      is_3d: is_3d || undefined,
    });
  });

  return hallInfoMap;
}

export type ImdbRating = { star: number; votes: number };

// Fetch IMDb ratings from IMDb's public dataset. This avoids relying on the
// kvikmyndir.is rating widget, which can be stale or missing and previously
// caused us to persist placeholder 0 ratings from IMDb links. Ratings are an
// optional extra, so an unavailable dataset yields no ratings rather than
// blocking the deploy; callers fall back to the kvikmyndir.is rating.
export async function fetch_imdb_ratings(
  imdbIds: readonly string[],
  dataset_url = "https://datasets.imdbws.com/title.ratings.tsv.gz"
): Promise<Map<string, ImdbRating>> {
  const ids = new Set(imdbIds);
  const ratings = new Map<string, ImdbRating>();
  if (ids.size === 0) return ratings;

  const response = await fetch(dataset_url, {
    headers: { "User-Agent": "hvaderibio/1.0" },
  });

  if (!response.ok) {
    console.error(`Skipping IMDb ratings, dataset unavailable: ${response.status} ${response.statusText}`);
    return ratings;
  }

  const { gunzipSync } = await import("node:zlib");
  const tsv = gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8");

  for (const line of tsv.split("\n").slice(1)) {
    if (ratings.size === ids.size) break;

    const [id, averageRating, numVotes] = line.split("\t");
    if (!ids.has(id)) continue;

    const star = parseFloat(averageRating);
    const votes = parseInt(numVotes);
    if (Number.isFinite(star) && star > 0 && Number.isFinite(votes)) {
      ratings.set(id, { star, votes });
    }
  }

  return ratings;
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
