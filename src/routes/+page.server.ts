import fs from "fs/promises";

export const prerender = true;

export async function load() {
  return {
    today: `Í dag, ${new Date()
      .toLocaleString("is-IS", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .replace("dagur", "daginn")}`,
    movies: JSON.parse(await fs.readFile("static/movies.json", "utf-8")),
  };
}
