import type { RequestEvent } from "@sveltejs/kit";

import fs from "fs/promises";

export const prerender = true;

export async function load({ setHeaders }: RequestEvent) {
  setHeaders({ "cache-control": "1800" });
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
