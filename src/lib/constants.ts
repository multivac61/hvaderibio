export const CAPITAL_REGION_CINEMAS = [
  "Bíó Paradís",
  "Háskólabíó",
  "Laugarásbíó",
  "Sambíóin Egilshöll",
  "Sambíóin Kringlunni",
  "Sambíóin Álfabakka",
  "Smárabíó",
] as const;

export type CapitalRegionCinema = (typeof CAPITAL_REGION_CINEMAS)[number];
