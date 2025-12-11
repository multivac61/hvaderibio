import { CAPITAL_REGION_CINEMAS } from "./constants";

export const DEFAULT_CINEMA_CHOICE = "Höfuðborgarsvæðið";

// Get cinemas array from choice label
export function get_cinemas_for_choice(choice: string, all_options: readonly (readonly [string, readonly string[]])[]): readonly string[] {
  const found = all_options.find(([label]) => label === choice);
  return found ? found[1] : [...CAPITAL_REGION_CINEMAS];
}
