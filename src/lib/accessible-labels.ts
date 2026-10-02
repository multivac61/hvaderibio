import { reykjavik_time } from "#lib/reykjavik.js";
import type { Movie, Showtime } from "#lib/schemas.js";

// Spoken names for screen readers. The visible UI relies on badges, logos
// and hover tooltips that assistive technology cannot read, or reads badly.

const NEW_TAB = " (opnast í nýjum flipa)";
// Icelandic decimal comma, without depending on the runtime's locale data
// (the prerender and the browser may not agree).
const number = { format: (n: number) => String(Math.round(n * 10) / 10).replace(".", ",") };

const FORMATS: readonly (readonly [keyof Showtime, string])[] = [
  ["is_icelandic", "íslenskt tal"],
  ["is_3d", "þrívídd"],
  ["is_luxus", "Lúxus"],
  ["is_vip", "VIP"],
  ["is_atmos", "Ásberg-hljóð"],
  ["is_max", "MAX"],
  ["is_flauel", "Flauel"],
];

export function showtime_label(showtime: Showtime): string {
  const parts = [reykjavik_time(showtime.time), showtime.hall, ...FORMATS.filter(([flag]) => showtime[flag]).map(([, name]) => name)];
  return `${parts.filter(Boolean).join(", ")}. Kaupa miða${NEW_TAB}`;
}

type Ratings = Pick<Movie, "imdb" | "rotten_tomatoes" | "metacritic" | "letterboxd">;

export function rating_labels({ imdb, rotten_tomatoes, metacritic, letterboxd }: Ratings) {
  const rt_audience = rotten_tomatoes?.audience_score === undefined ? "" : `, áhorfendur ${rotten_tomatoes.audience_score}%`;
  const mc_users = metacritic?.user_score === undefined ? "" : `, notendur ${metacritic.user_score} af 100`;
  return {
    imdb: imdb?.star === undefined ? undefined : `IMDb ${number.format(imdb.star)} af 10${NEW_TAB}`,
    rotten_tomatoes: rotten_tomatoes && `Rotten Tomatoes ${rotten_tomatoes.score}%${rt_audience}${NEW_TAB}`,
    metacritic: metacritic && `Metacritic ${metacritic.score} af 100${mc_users}${NEW_TAB}`,
    letterboxd: letterboxd?.score === undefined ? undefined : `Letterboxd ${number.format(letterboxd.score)} af 5${NEW_TAB}`,
  };
}

export const external_link_label = (name: string) => `${name}${NEW_TAB}`;

/** "1 mynd", "21 mynd", "11 myndir": Icelandic uses the singular after numbers ending in 1, except 11. */
export const count_label = (n: number, singular: string, plural: string) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? singular : plural}`;
