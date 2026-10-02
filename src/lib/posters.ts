import { mkdir, readdir, rm } from "fs/promises";
import { dirname, join } from "path";
import sharp from "sharp";

import { map_concurrent } from "#lib/concurrency.js";

type PosterSource = { id: number; title: string; poster_url: string };

// 360w for 1x phones, 720w for 2x phones and the grid, 1080w for desktop.
const SIZES = [
  { suffix: "-360w", width: 360, quality: 70 },
  { suffix: "", width: 720, quality: 72 },
  { suffix: "-1080w", width: 1080, quality: 72 },
] as const;

const poster_file = /^(\d+)(?:-\d+w)?\.webp$/;

async function read_manifest(path: string): Promise<Record<string, string>> {
  try {
    return await Bun.file(path).json();
  } catch {
    return {};
  }
}

async function encode_poster(movie: PosterSource, dir: string, headers?: HeadersInit) {
  const response = await fetch(movie.poster_url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${movie.poster_url}`);

  const image = sharp(await response.arrayBuffer());
  await Promise.all(
    SIZES.map(({ suffix, width, quality }) =>
      image
        .clone()
        .resize(width, Math.round(width * 1.5), { fit: "cover" })
        .webp({ quality, effort: 6, smartSubsample: true })
        .toFile(join(dir, `${movie.id}${suffix}.webp`))
    )
  );
}

/**
 * Write responsive WebP posters for `movies` into `dir`. Encoding at effort 6
 * is slow, so a poster is only re-encoded when its source URL changes; the
 * manifest of encoded sources lives outside the deployed directory. Posters
 * of movies no longer showing are removed.
 */
export async function refresh_posters(
  movies: readonly PosterSource[],
  dir: string,
  { manifest_path = join(dir, ".poster-sources.json"), headers }: { manifest_path?: string; headers?: HeadersInit } = {}
) {
  const manifest = await read_manifest(manifest_path);
  const existing = new Set(await readdir(dir));
  const is_current = (movie: PosterSource) =>
    manifest[movie.id] === movie.poster_url && SIZES.every(({ suffix }) => existing.has(`${movie.id}${suffix}.webp`));

  const stale = movies.filter((movie) => !is_current(movie));
  await map_concurrent(stale, 4, async (movie) => {
    try {
      await encode_poster(movie, dir, headers);
      manifest[movie.id] = movie.poster_url;
    } catch (error) {
      // Keep the movie listed; a later refresh retries its poster.
      delete manifest[movie.id];
      console.error(`Failed to process poster for movie ID ${movie.id} (${movie.title}):`, error);
    }
  });

  const showing = new Set(movies.map(({ id }) => String(id)));
  await Promise.all(
    [...existing]
      .filter((name) => {
        const id = poster_file.exec(name)?.[1];
        return id !== undefined && !showing.has(id);
      })
      .map((name) => rm(join(dir, name)))
  );

  const current = Object.fromEntries(Object.entries(manifest).filter(([id]) => showing.has(id)));
  await mkdir(dirname(manifest_path), { recursive: true });
  await Bun.write(manifest_path, JSON.stringify(current, null, 2));

  console.log(`Posters: ${stale.length} encoded, ${movies.length - stale.length} reused`);
}
