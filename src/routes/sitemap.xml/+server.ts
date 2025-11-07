import { movies_schema } from "$lib/schemas";
import movies_json from "../../../static/movies.json";

const site_url = "https://hvaderibio.is";

export const prerender = true;

export const GET = async () => {
  const movies = movies_schema.parse(movies_json);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site_url}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${movies
      .map(
        (movie) => `  <url>
    <loc>${site_url}/movie/${movie.id}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
      )
      .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
