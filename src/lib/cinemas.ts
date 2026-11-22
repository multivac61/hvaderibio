import { CAPITAL_REGION_CINEMAS, CINEMA_DISPLAY_NAMES } from "#lib/constants.js";
import type { Movie } from "#lib/schemas.js";

// Shorter than the names on the showtimes, to keep the picker's list
// scannable: Akureyri's is the only cinema outside the capital, so the town
// says enough.
const PICKER_NAMES: Record<string, string> = { ...CINEMA_DISPLAY_NAMES, "Sambíóin Akureyri": "Akureyri" };

export type CinemaOption = readonly [string, readonly string[]];

export const get_all_cinemas = (movies: readonly Movie[]) =>
  movies
    .flatMap((movie) => Object.values(movie.showtimes_by_day).flatMap((day) => Object.keys(day)))
    .filter((name, index, array) => array.indexOf(name) === index)
    .sort();

export const get_cinema_options = (movies: readonly Movie[]): readonly CinemaOption[] => {
  const all_cinemas = get_all_cinemas(movies);
  const capital_region_cinemas = all_cinemas.filter((name) => (CAPITAL_REGION_CINEMAS as readonly string[]).includes(name));

  return [
    ["Öll", all_cinemas],
    ["Höfuðborgarsvæðið", capital_region_cinemas],
    ...picker_labels(all_cinemas)
      .toSorted((a, b) => a[0].localeCompare(b[0], "is"))
      .map(([label, name]) => [label, [name]] as const),
  ] as const;
};

// Each cinema's label in the picker. The label is also the selection's key,
// so a short name that another cinema already goes by gives way to the
// cinema's full name.
const picker_labels = (cinemas: readonly string[]) => {
  const taken = new Set([...cinemas.filter((name) => !(name in PICKER_NAMES)), "Öll", "Höfuðborgarsvæðið"]);
  return cinemas.map((name) => {
    const short = PICKER_NAMES[name];
    const label = short && !taken.has(short) ? short : name;
    taken.add(label);
    return [label, name] as const;
  });
};
