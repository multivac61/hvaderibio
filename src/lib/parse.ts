import { movie_schema, cinema_showtimes_schema, type CinemaShowtimes } from "./schemas";

function combineDateWithTime(hour_minute: string): string {
  const [hours, minutes] = hour_minute.split(":");

  const today = new Date();
  today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return today.toISOString();
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
    cinema_showtimes: parse_showtimes(document),
    trailer_url: match ? `https://www.youtube.com/watch?v=${match[1]}` : undefined,
    id,
  });
  return parsed.success ? parsed.data : null;
}

export function parse_showtimes(document: Document) {
  const cinema_showtimes: CinemaShowtimes = {};
  document.querySelectorAll<HTMLDivElement>("div.times_day.day0 div.biotimar").forEach((cinema) => {
    const cinema_name = cinema.querySelector<HTMLHeadElement>("h3")?.textContent?.trim() ?? "";

    cinema_showtimes[cinema_name] = [...cinema.querySelectorAll<HTMLLIElement>("li.qtip.tip-top")].map((showtime) => {
      const rateLink = showtime.querySelector<HTMLAnchorElement>("a.rate");
      const salurDiv = showtime.querySelector<HTMLDivElement>("div.salur");
      return {
        time: combineDateWithTime(rateLink?.firstChild?.textContent?.replace(".", ":") ?? ""),
        purchase_url: rateLink ? decodeURI(rateLink.href).trim() : "",
        hall: salurDiv?.firstChild?.textContent?.trim() ?? "",
      };
    });
  });
  return cinema_showtimes_schema.parse(cinema_showtimes);
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
