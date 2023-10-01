import { movie_schema, cinema_showtimes_schema, type CinemaShowtimes, type Movie } from "./schemas";

function combineDateWithTime(hour_minute: string): string {
  const [hours, minutes] = hour_minute.split(":");

  const today = new Date();
  today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return today.toISOString();
}

export function parse_movie(document: Document, id: number): Partial<Movie> {
  // const res = await fetch(poster_url ?? "", { headers });
  // const abuffer = await res.arrayBuffer();
  // const buffer = Buffer.from(new Uint8Array(abuffer));
  // const buff = await sharp(buffer).toFormat("jpeg").toBuffer();
  // let base64data = buff.toString("base64");
  // poster: `data:image/jpeg;base64,${base64data.toString()}`,

  const match = document.querySelector<HTMLImageElement>("div.trailer_play_item > img")?.src?.match(/\/vi\/(.+?)\//);
  const trailer_url = match ? `https://www.youtube.com/watch?v=${match[1]}` : undefined;

  return movie_schema.parse({
    title: document.querySelector<HTMLHeadElement>("h1")?.firstChild?.textContent?.trim(),
    alt_title: document.querySelector<HTMLHeadElement>("h4")?.textContent?.replace(/\(|\)/g, ""),
    release_year: parseInt(document?.querySelector<HTMLSpanElement>("span.year")?.textContent?.trim()!),
    poster_url: document.querySelector<HTMLAnchorElement>("div.poster > a")?.href?.trim(),
    content_rating: document.querySelector("span.certtext")?.textContent?.trim(),
    description: document.querySelector<HTMLParagraphElement>("p.description")?.textContent?.trim(),
    genres: [...document.querySelectorAll("div.genres span")].map((genre) => genre?.textContent!),
    duration_in_mins: parseInt(document.querySelector("span.duration")?.textContent?.replace("mín", "").replace("MÍN", "").trim() ?? "0"),
    language: [...document.querySelectorAll("div.combined_details > span:nth-child(2)")].map((l) => l?.textContent?.trim()!),
    cinema_showtimes: parse_showtimes(document),
    trailer_url,
    id,
  });
}

export function parse_showtimes(document: Document): CinemaShowtimes {
  const cinema_showtimes: CinemaShowtimes = {};
  document.querySelectorAll<HTMLDivElement>("div.times_day.day0 div.biotimar").forEach((cinema) => {
    const cinema_name: string = cinema.querySelector<HTMLHeadElement>("h3")?.textContent?.trim()!;

    cinema_showtimes[cinema_name] = [...cinema.querySelectorAll<HTMLLIElement>("li.qtip.tip-top")].map((showtime) => {
      return {
        time: combineDateWithTime(showtime.querySelector<HTMLAnchorElement>("a.rate")?.firstChild?.textContent?.replace(".", ":")!),
        purchase_url: decodeURI(showtime.querySelector<HTMLAnchorElement>("a.rate")?.href!).trim(),
        hall: showtime.querySelector<HTMLDivElement>("div.salur")?.firstChild?.textContent?.trim(),
      };
    });
  });
  return cinema_showtimes_schema.parse(cinema_showtimes);
}

export function parse_movie_ids(document: Document): number[] {
  return [...document.querySelectorAll<HTMLAnchorElement>("a.movie_title")].map((a) => parseInt(a?.href?.match(/\d+/g)![0]));
}
