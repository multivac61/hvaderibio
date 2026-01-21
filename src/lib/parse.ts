import { movie_schema, cinema_showtimes_schema, type CinemaShowtimes, type ShowtimesByDay } from "./schemas";

function combineDateWithTime(hour_minute: string, dayOffset: number = 0): string {
  // Handle both "15:10" and "15.10" formats
  const normalized = hour_minute.replace(".", ":");
  const [hours, minutes] = normalized.split(":");

  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(parseInt(hours), parseInt(minutes || "0"), 0, 0);
  return date.toISOString();
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
  let imdb: { link: string; star: number } | undefined;
  let rotten_tomatoes: { score: number } | undefined;
  let metacritic: { score: number } | undefined;

  document.querySelectorAll<HTMLDivElement>("div.mp-hero__rating-item").forEach((item) => {
    const img = item.querySelector("img");
    const scoreEl = item.querySelector<HTMLSpanElement>("span.mp-hero__rating-score");
    const scoreText = scoreEl?.textContent?.trim() ?? "";
    const link = item.querySelector<HTMLAnchorElement>("a")?.href;

    if (img?.alt?.toLowerCase().includes("imdb")) {
      const star = parseFloat(scoreText);
      if (!isNaN(star) && link) {
        imdb = { link, star };
      }
    } else if (img?.alt?.toLowerCase().includes("rotten")) {
      const score = parseInt(scoreText.replace("%", ""));
      if (!isNaN(score)) {
        rotten_tomatoes = { score };
      }
    } else if (img?.alt?.toLowerCase().includes("metacritic")) {
      const score = parseInt(scoreText);
      if (!isNaN(score)) {
        metacritic = { score };
      }
    }
  });

  // Also check external links section for IMDb if not found in ratings
  if (!imdb) {
    const imdbLink = document.querySelector<HTMLAnchorElement>("a.mp-external-links__item[href*='imdb.com']");
    if (imdbLink) {
      imdb = { link: imdbLink.href, star: 0 };
    }
  }

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
    showtimes_by_day: parse_showtimes_by_day(document),
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

export function parse_showtimes_by_day(document: Document): ShowtimesByDay {
  const showtimes_by_day: ShowtimesByDay = {};

  // Parse days 0-3 (today through 3 days from now)
  for (let day = 0; day <= 3; day++) {
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

// Fetch RT, Metacritic, and Letterboxd URLs from Wikidata using IMDb ID
export async function fetch_external_urls(imdbId: string): Promise<{ rtUrl?: string; mcUrl?: string; letterboxdUrl?: string }> {
  try {
    const sparql = `
      SELECT ?rtId ?mcId ?lbId WHERE {
        ?movie wdt:P345 "${imdbId}" .
        OPTIONAL { ?movie wdt:P1258 ?rtId . }
        OPTIONAL { ?movie wdt:P1712 ?mcId . }
        OPTIONAL { ?movie wdt:P6127 ?lbId . }
      }`;

    const response = await fetch("https://query.wikidata.org/sparql?" + new URLSearchParams({ query: sparql, format: "json" }), {
      headers: { "User-Agent": "hvaderibio/1.0" },
    });

    const data = await response.json();
    const result = data.results?.bindings?.[0];

    return {
      rtUrl: result?.rtId?.value ? `https://www.rottentomatoes.com/${result.rtId.value}` : undefined,
      mcUrl: result?.mcId?.value ? `https://www.metacritic.com/${result.mcId.value}` : undefined,
      letterboxdUrl: result?.lbId?.value ? `https://letterboxd.com/film/${result.lbId.value}/` : undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch external URLs for ${imdbId}:`, error);
    return {};
  }
}

// Scrape Rotten Tomatoes scores from RT page
export async function scrape_rotten_tomatoes(url: string): Promise<{ score?: number; audience_score?: number } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) return null;
    const html = await response.text();

    // Extract tomatometer score from score-board or rt-text
    let score: number | undefined;
    let audience_score: number | undefined;

    // Look for JSON-LD data first (most reliable)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.aggregateRating?.ratingValue) {
          // RT stores as percentage in some cases
          const rating = parseFloat(jsonLd.aggregateRating.ratingValue);
          if (rating <= 10) {
            score = Math.round(rating * 10);
          } else {
            score = Math.round(rating);
          }
        }
      } catch {
        // JSON parse failed, try regex fallback
      }
    }

    // Fallback: Look for tomatometer in HTML
    if (!score) {
      const tomatometerMatch = html.match(/tomatometer[^>]*>(\d+)%?</i) || html.match(/"tomatometerScore":(\d+)/);
      if (tomatometerMatch) {
        score = parseInt(tomatometerMatch[1]);
      }
    }

    // Look for audience score
    const audienceMatch = html.match(/audienceScore[^>]*>(\d+)%?</i) || html.match(/"audienceScore":(\d+)/);
    if (audienceMatch) {
      audience_score = parseInt(audienceMatch[1]);
    }

    if (score !== undefined) {
      return { score, audience_score };
    }
    return null;
  } catch (error) {
    console.error(`Failed to scrape RT scores from ${url}:`, error);
    return null;
  }
}

// Scrape Metacritic scores from MC page
export async function scrape_metacritic(url: string): Promise<{ score?: number; user_score?: number } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) return null;
    const html = await response.text();

    let score: number | undefined;
    let user_score: number | undefined;

    // Look for metascore in JSON data or HTML
    const metascoreMatch =
      html.match(/"metaScore":(\d+)/) ||
      html.match(/metascore[^>]*>(\d+)</i) ||
      html.match(/<span[^>]*class="[^"]*metascore[^"]*"[^>]*>(\d+)</i);
    if (metascoreMatch) {
      score = parseInt(metascoreMatch[1]);
    }

    // Look for user score (usually as X.X format)
    const userScoreMatch = html.match(/"userScore":([\d.]+)/) || html.match(/userscore[^>]*>([\d.]+)</i);
    if (userScoreMatch) {
      const rawScore = parseFloat(userScoreMatch[1]);
      // Convert from 0-10 scale to 0-100
      user_score = rawScore <= 10 ? Math.round(rawScore * 10) : Math.round(rawScore);
    }

    if (score !== undefined) {
      return { score, user_score };
    }
    return null;
  } catch (error) {
    console.error(`Failed to scrape MC scores from ${url}:`, error);
    return null;
  }
}

// Scrape Letterboxd score from Letterboxd page
export async function scrape_letterboxd(url: string): Promise<{ score?: number } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) return null;
    const html = await response.text();

    // Letterboxd shows rating as X.X out of 5
    const ratingMatch = html.match(/"ratingValue":\s*([\d.]+)/) || html.match(/average rating of ([\d.]+)/i);
    if (ratingMatch) {
      const rating = parseFloat(ratingMatch[1]);
      // Return as 0-5 scale (Letterboxd's native format)
      return { score: Math.round(rating * 10) / 10 };
    }

    return null;
  } catch (error) {
    console.error(`Failed to scrape Letterboxd score from ${url}:`, error);
    return null;
  }
}
