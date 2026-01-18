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
  Laugarásbíó: "https://laugarasbio.is",
  "Sambíóin Egilshöll": "https://sambio.is/kinemas/egillsholl",
  "Sambíóin Kringlunni": "https://sambio.is/kinemas/kringlunni",
  "Sambíóin Álfabakka": "https://sambio.is/kinemas/alfabakki",
  Smárabíó: "https://smarabio.is",
};
