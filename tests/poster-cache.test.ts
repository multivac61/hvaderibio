import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { process_movie_poster } from "../src/lib/poster-cache";

test("restored posters avoid a download and preserve their encoded files", async () => {
  const scratch = join(homedir(), ".Codex/outputs");
  await mkdir(scratch, { recursive: true });
  const directory = await mkdtemp(join(scratch, "poster-cache-"));
  const jpeg = await sharp({ create: { width: 40, height: 50, channels: 3, background: "#336699" } })
    .jpeg()
    .toBuffer();
  let requests = 0;
  const server = Bun.serve({
    port: 0,
    fetch: () => {
      requests++;
      return new Response(jpeg);
    },
  });
  const movie = { id: 42, poster_url: server.url.href };
  const options = { staticDirectory: join(directory, "static"), cacheDirectory: join(directory, "cache"), day: "2026-09-15" };
  try {
    const images = await process_movie_poster(movie, options);
    for (const [key, width, height] of [
      ["small", 360, 540],
      ["medium", 720, 1080],
      ["large", 1080, 1620],
    ] as const) {
      expect(images[key]).toMatch(/^\/posters\/42-[a-f0-9]{16}-\d+w\.webp$/);
      expect(await sharp(join(options.staticDirectory, images[key])).metadata()).toMatchObject({ width, height, format: "webp" });
    }
    const file = join(options.staticDirectory, images.medium);
    const original = await stat(file);
    expect(await process_movie_poster(movie, options)).toEqual(images);
    expect((await stat(file)).mtimeMs).toBe(original.mtimeMs);
    expect(requests).toBe(1);
  } finally {
    server.stop(true);
    await rm(directory, { recursive: true, force: true });
  }
});

test.each(["new day", "new source URL", "missing output"])("refreshes a restored poster after %s", async (reason) => {
  const scratch = join(homedir(), ".Codex/outputs");
  await mkdir(scratch, { recursive: true });
  const directory = await mkdtemp(join(scratch, "poster-refresh-"));
  let jpeg = await sharp({ create: { width: 40, height: 50, channels: 3, background: "#ff0000" } })
    .jpeg()
    .toBuffer();
  let requests = 0;
  const server = Bun.serve({
    port: 0,
    fetch: () => {
      requests++;
      return new Response(jpeg);
    },
  });
  const movie = { id: 42, poster_url: server.url.href };
  const options = { staticDirectory: join(directory, "static"), cacheDirectory: join(directory, "cache"), day: "2026-09-15" };
  try {
    const original = await process_movie_poster(movie, options);
    jpeg = await sharp({ create: { width: 40, height: 50, channels: 3, background: "#0000ff" } })
      .jpeg()
      .toBuffer();
    if (reason === "new day") options.day = "2026-09-16";
    if (reason === "new source URL") movie.poster_url += "replacement.jpg";
    if (reason === "missing output") await rm(join(options.staticDirectory, original.small));
    const updated = await process_movie_poster(movie, options);
    expect(requests).toBe(2);
    for (const key of ["small", "medium", "large"] as const) expect(updated[key]).not.toBe(original[key]);
  } finally {
    server.stop(true);
    await rm(directory, { recursive: true, force: true });
  }
});
