import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mkdtemp, readdir, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { refresh_posters } from "../src/lib/posters";
import { serve, type TestServer } from "./serve";

let server: TestServer;
let requests = 0;
let dir: string;

beforeAll(async () => {
  const jpeg = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#336699" } })
    .jpeg()
    .toBuffer();
  server = await serve(() => {
    requests++;
    return new Response(jpeg, { headers: { "Content-Type": "image/jpeg" } });
  });
  dir = await mkdtemp(join(tmpdir(), "posters-"));
});
afterAll(async () => {
  await server.close();
  await rm(dir, { recursive: true, force: true });
});

const movie = (id: number, version: string) => ({
  id,
  title: `Movie ${id}`,
  poster_url: new URL(`/${id}-${version}.jpg`, server.url).href,
});
const files = async () => (await readdir(dir)).filter((name) => name.endsWith(".webp")).sort();

describe("refresh_posters", () => {
  test("encodes three WebP sizes for a new poster", async () => {
    await refresh_posters([movie(1, "a")], dir);

    expect(await files()).toEqual(["1-1080w.webp", "1-360w.webp", "1.webp"]);
    expect((await sharp(join(dir, "1-360w.webp")).metadata()).width).toBe(360);
    expect(requests).toBe(1);
  });

  test("reuses posters whose source is unchanged", async () => {
    const before = (await stat(join(dir, "1.webp"))).mtimeMs;

    await refresh_posters([movie(1, "a")], dir);

    expect(requests).toBe(1);
    expect((await stat(join(dir, "1.webp"))).mtimeMs).toBe(before);
  });

  test("re-encodes a poster when its source changes and prunes posters of departed movies", async () => {
    await refresh_posters([movie(2, "a")], dir);
    expect(requests).toBe(2);

    await refresh_posters([movie(2, "b")], dir);

    expect(requests).toBe(3);
    expect(await files()).toEqual(["2-1080w.webp", "2-360w.webp", "2.webp"]);
  });
});
