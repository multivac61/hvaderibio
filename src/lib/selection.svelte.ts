import type { CinemaOption } from "#lib/cinemas.js";
import { CAPITAL_REGION_CINEMAS } from "#lib/constants.js";

export const DEFAULT_CINEMA_CHOICE = "Höfuðborgarsvæðið";

// The visitor's chosen cinema and day, shared by every page for the session.
export const selection = $state({ cinema: DEFAULT_CINEMA_CHOICE, day: "0" });

// The cinemas a choice stands for, e.g. "Höfuðborgarsvæðið" → the capital-region cinemas.
export function get_cinemas_for_choice(choice: string, all_options: readonly CinemaOption[]): readonly string[] {
  const found = all_options.find(([label]) => label === choice);
  return found ? found[1] : [...CAPITAL_REGION_CINEMAS];
}
