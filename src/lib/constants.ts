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

export const CINEMA_URLS: Record<string, string> = {
  "Bíó Paradís": "https://bioparadis.is",
  Háskólabíó: "https://haskolabio.is",
  Laugarásbíó: "https://laugarasbio.is/i-bio",
  "Sambíóin Egilshöll": "https://www.sambio.is/showtimes",
  "Sambíóin Kringlunni": "https://www.sambio.is/showtimes",
  "Sambíóin Álfabakka": "https://www.sambio.is/showtimes",
  Smárabíó: "https://smarabio.is/bio",
};
