// Install the sample catalogue into static/ so the site builds and has posters
// to scroll past without scraping. Replaces the local movies.json and posters;
// meant for CI.
import { copyFile, mkdir, mkdtemp, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { movies_schema } from "#lib/schemas.js";
import { refresh_posters } from "#lib/posters.js";
import { serve } from "../serve.ts";

const fixture = join(import.meta.dirname, "movies.json");
const movies = movies_schema.parse(JSON.parse(await readFile(fixture, "utf-8")));

await mkdir("static", { recursive: true });
await copyFile(fixture, "static/movies.json");

// The prerenderer follows poster links, so every size must exist. Encode a
// plain placeholder through the real pipeline to get the same file names.
const placeholder = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#336699" } })
  .jpeg()
  .toBuffer();
const server = await serve(() => new Response(placeholder, { headers: { "Content-Type": "image/jpeg" } }));
try {
  await refresh_posters(
    movies.map(({ id, title }) => ({ id, title, poster_url: `${server.url}${id}` })),
    "static",
    { manifest_path: join(await mkdtemp(join(tmpdir(), "fixture-posters-")), "sources.json") }
  );
} finally {
  await server.close();
}
