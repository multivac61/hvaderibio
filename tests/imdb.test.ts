import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { fetch_imdb_ratings } from "../src/lib/imdb";

const dataset =
  "tconst\taverageRating\tnumVotes\n" +
  "tt0000001\t5.7\t2200\r\n" +
  "tt0000002\t6.0\t400\n" +
  "tt0000003\tN/A\t100\n" +
  "tt0000004\t8.2\t12000";

test("reads requested ratings from a restored gzip file without network access", async () => {
  const scratch = join(homedir(), ".Codex/outputs");
  await mkdir(scratch, { recursive: true });
  const directory = await mkdtemp(join(scratch, "imdb-cache-"));
  const datasetFile = join(directory, "ratings.tsv.gz");
  try {
    await writeFile(datasetFile, gzipSync(dataset));
    const result = await fetch_imdb_ratings(["tt0000001", "tt0000003", "tt0000004", "tt9999999"], {
      datasetFile,
      datasetUrl: "http://127.0.0.1:1/must-not-fetch",
    });
    expect([...result]).toEqual([
      ["tt0000001", { star: 5.7, votes: 2200 }],
      ["tt0000004", { star: 8.2, votes: 12000 }],
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("streams a chunked gzip response and rejects corrupt downloads", async () => {
  const gzip = gzipSync(dataset);
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      if (new URL(request.url).pathname === "/broken") return new Response(gzip.subarray(0, 20));
      return new Response(
        new ReadableStream({
          async start(controller) {
            for (let offset = 0; offset < gzip.length; offset += 7) {
              controller.enqueue(gzip.subarray(offset, offset + 7));
              await Bun.sleep(1);
            }
            controller.close();
          },
        }),
        { headers: { "Content-Type": "application/gzip" } }
      );
    },
  });
  try {
    expect([...(await fetch_imdb_ratings(["tt0000004"], { datasetFile: "", datasetUrl: server.url.href }))]).toEqual([
      ["tt0000004", { star: 8.2, votes: 12000 }],
    ]);
    await expect(fetch_imdb_ratings(["tt0000004"], { datasetFile: "", datasetUrl: new URL("broken", server.url).href })).rejects.toThrow();
  } finally {
    server.stop(true);
  }
});
