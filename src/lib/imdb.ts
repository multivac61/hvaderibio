import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { StringDecoder } from "node:string_decoder";
import { createGunzip } from "node:zlib";

export type ImdbRating = { star: number; votes: number };

// Actions supplies a daily cached gzip. Local scrapes can stream the live dataset.
export async function fetch_imdb_ratings(
  imdbIds: readonly string[],
  {
    datasetFile = process.env.IMDB_RATINGS_FILE,
    datasetUrl = "https://datasets.imdbws.com/title.ratings.tsv.gz",
  }: { datasetFile?: string; datasetUrl?: string } = {}
): Promise<Map<string, ImdbRating>> {
  const ids = new Set(imdbIds);
  const ratings = new Map<string, ImdbRating>();
  if (ids.size === 0) return ratings;

  const input = datasetFile ? createReadStream(datasetFile) : await download(datasetUrl);
  const decoder = new StringDecoder("utf8");
  let pending = "";
  const readLine = (line: string) => {
    const [id, averageRating, numVotes] = line.trimEnd().split("\t");
    if (!ids.has(id)) return;
    const star = Number(averageRating);
    const votes = Number(numVotes);
    if (Number.isFinite(star) && star > 0 && star <= 10 && Number.isInteger(votes) && votes >= 0) {
      ratings.set(id, { star, votes });
    }
  };
  await pipeline(input, createGunzip(), async (source) => {
    for await (const chunk of source) {
      pending += decoder.write(chunk);
      let start = 0;
      let end: number;
      while ((end = pending.indexOf("\n", start)) !== -1) {
        readLine(pending.slice(start, end));
        start = end + 1;
      }
      pending = pending.slice(start);
    }
    pending += decoder.end();
    if (pending) readLine(pending);
  });
  return ratings;
}

async function download(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "hvaderibio/1.0" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok || !response.body) throw new Error(`Failed to fetch IMDb ratings dataset: ${response.status}`);
  return Readable.from(response.body);
}
