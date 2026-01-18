import { movie_schema, cinema_showtimes_schema, type CinemaShowtimes, type ShowtimesByDay } from "./schemas";

function combineDateWithTime(hour_minute: string, dayOffset: number = 0): string {
  const [hours, minutes] = hour_minute.split(":");

  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date.toISOString();
}

export function parse_movie(document: Document, id: number) {
  const match = document.querySelector<HTMLImageElement>("div.trailer_play_item > img")?.src?.match(/\/vi\/(.+?)\//);

  const rating_urls: string[] = [];
  document.querySelectorAll<HTMLAnchorElement>("div.movie-ratings > div.rating-box > a").forEach((a) => {
    rating_urls.push(a.href.trim());
  });

  const description =
    document.querySelector<HTMLParagraphElement>("p.description.fullplot")?.textContent?.replace("...  minna", "").trim() ??
    document.querySelector<HTMLParagraphElement>("p.description")?.textContent?.trim();

  // Extract IMDb info
  let imdb: { link: string; star: number } | undefined;
  const imdbBox = [...document.querySelectorAll("div.rating-box")].find((box) => box.innerHTML.includes("imdb.com"));
  if (imdbBox) {
    const link = imdbBox.querySelector<HTMLAnchorElement>("a")?.href?.trim();
    const starText = imdbBox.querySelector(".imdb-rating strong")?.textContent?.trim();
    if (link && starText) {
      const star = parseFloat(starText);
      if (!isNaN(star)) {
        imdb = { link, star };
      }
    }
  }

  // Extract Rotten Tomatoes score
  let rotten_tomatoes: { score: number } | undefined;
  const rtBox = [...document.querySelectorAll("div.rating-box")].find((box) => box.innerHTML.includes("Rottentomatoes"));
  if (rtBox) {
    const scoreText = rtBox.querySelector("strong")?.textContent?.trim();
    const scoreMatch = scoreText?.match(/(\d+)/);
    if (scoreMatch) {
      rotten_tomatoes = { score: parseInt(scoreMatch[1]) };
    }
  }

  // Extract Metacritic score
  let metacritic: { score: number } | undefined;
  const mcBox = [...document.querySelectorAll("div.rating-box")].find((box) => box.innerHTML.includes("Metacritic"));
  if (mcBox) {
    const scoreText = mcBox.querySelector("strong")?.textContent?.trim();
    const scoreMatch = scoreText?.match(/(\d+)/);
    if (scoreMatch) {
      metacritic = { score: parseInt(scoreMatch[1]) };
    }
  }

  const parsed = movie_schema.safeParse({
    title: document.querySelector<HTMLHeadElement>("h1")?.firstChild?.textContent?.trim(),
    alt_title: document.querySelector<HTMLHeadElement>("h4")?.textContent?.replace(/\(|\)/g, ""),
    release_year: parseInt(document?.querySelector<HTMLSpanElement>("span.year")?.textContent?.trim() ?? "0"),
    poster_url: document.querySelector<HTMLAnchorElement>("div.poster > a")?.href?.trim(),
    rating_urls,
    content_rating: document.querySelector("span.certtext")?.textContent?.trim(),
    description,
    genres: [...document.querySelectorAll("div.genres span")].map((genre) => genre?.textContent ?? ""),
    duration_in_mins: parseInt(document.querySelector("span.duration")?.textContent?.replace("mín", "").replace("MÍN", "").trim() ?? "0"),
    language: [...document.querySelectorAll("div.combined_details > span:nth-child(2)")].map((l) => l?.textContent?.trim() ?? ""),
    showtimes_by_day: parse_showtimes_by_day(document),
    trailer_url: match ? `https://www.youtube.com/watch?v=${match[1]}` : undefined,
    id,
    imdb,
    rotten_tomatoes,
    metacritic,
  });
  return parsed.success ? parsed.data : null;
}

function parse_showtimes_for_day(document: Document, dayIndex: number): CinemaShowtimes {
  const cinema_showtimes: CinemaShowtimes = {};
  document.querySelectorAll<HTMLDivElement>(`div.times_day.day${dayIndex} div.biotimar`).forEach((cinema) => {
    const cinema_name = cinema.querySelector<HTMLHeadElement>("h3")?.textContent?.trim() ?? "";

    cinema_showtimes[cinema_name] = [...cinema.querySelectorAll<HTMLLIElement>("li.qtip.tip-top")].map((showtime) => {
      const rateLink = showtime.querySelector<HTMLAnchorElement>("a.rate");
      const salurDiv = showtime.querySelector<HTMLDivElement>("div.salur");
      const showtimeText = showtime.textContent?.toUpperCase() ?? "";
      const showtimeHtml = showtime.innerHTML?.toUpperCase() ?? "";

      const hall = salurDiv?.firstChild?.textContent?.trim() ?? "";
      const hallUpper = hall.toUpperCase();

      // Check for Icelandic dubbed: look for "ÍSL TAL" text or Icelandic flag image
      const hasIcelandicFlag = showtime.querySelector('img[src*="flag"]') !== null;
      const is_icelandic = showtimeText.includes("ÍSL TAL") || showtimeText.includes("ÍSL. TAL") || hasIcelandicFlag;

      // Check for 3D
      const is_3d = showtimeText.includes("3D") || showtimeHtml.includes("3D");

      // Check for LÚXUS (premium seating) - check both text and hall name
      const is_luxus =
        showtimeText.includes("LÚXUS") || showtimeText.includes("LÚX") || hallUpper.includes("LÚXUS") || hallUpper.includes("LÚX");

      // Check for VIP - check both text and hall name
      const is_vip = showtimeText.includes("VIP") || hallUpper.includes("VIP");

      // Check for ÁSBERG (Dolby Atmos) - check both text and hall name
      const is_atmos = showtimeText.includes("ÁSBERG") || showtimeText.includes("ATMOS") || hallUpper.includes("ÁSBERG");

      // Check for MAX (large format) - check both text and hall name
      const is_max = showtimeText.includes("MAX") || hallUpper === "MAX";

      // Check for FLAUEL (premium velvet seating)
      const is_flauel = showtimeText.includes("FLAUEL") || hallUpper.includes("FLAUEL");

      return {
        time: combineDateWithTime(rateLink?.firstChild?.textContent?.replace(".", ":") ?? "", dayIndex),
        purchase_url: rateLink ? decodeURI(rateLink.href).trim() : "",
        hall,
        is_icelandic: is_icelandic || undefined,
        is_3d: is_3d || undefined,
        is_luxus: is_luxus || undefined,
        is_vip: is_vip || undefined,
        is_atmos: is_atmos || undefined,
        is_max: is_max || undefined,
        is_flauel: is_flauel || undefined,
      };
    });
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
