import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod/mini";
import { poster_images_schema, type Movie, type PosterImages } from "./schemas";
import { fetch_page } from "./scrape-requests";

const sizes = [
  { key: "small", width: 360, height: 540, quality: 70 },
  { key: "medium", width: 720, height: 1080, quality: 72 },
  { key: "large", width: 1080, height: 1620, quality: 72 },
] as const;
const webpOptions = { effort: 6, nearLossless: false, smartSubsample: true };
const recipe = JSON.stringify({ sizes, webpOptions, fit: "cover", versions: sharp.versions });
const cacheSchema = z.object({ source: z.string(), day: z.string(), recipe: z.string(), images: poster_images_schema });

export async function process_movie_poster(
  movie: Pick<Movie, "id" | "poster_url">,
  {
    staticDirectory = "static",
    cacheDirectory = join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "hvaderibio/posters"),
    day = new Date().toISOString().slice(0, 10),
    headers,
  }: { staticDirectory?: string; cacheDirectory?: string; day?: string; headers?: HeadersInit } = {}
): Promise<PosterImages> {
  const cachePath = join(cacheDirectory, `${movie.id}.json`);
  try {
    const cached = cacheSchema.parse(JSON.parse(await readFile(cachePath, "utf8")));
    if (cached.source === movie.poster_url && cached.day === day && cached.recipe === recipe) {
      await Promise.all(
        Object.values(cached.images).map(async (image) => {
          if (!/^\/posters\/\d+-[a-f0-9]{16}-\d+w\.webp$/.test(image)) throw new Error("Invalid cached poster path");
          await access(join(staticDirectory, image));
        })
      );
      return cached.images;
    }
  } catch {
    // A missing, incomplete or obsolete cache is rebuilt from the source.
  }

  const response = await fetch_page(movie.poster_url, { headers });
  if (!response.ok) throw new Error(`Failed to fetch poster ${movie.poster_url}: ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  await mkdir(join(staticDirectory, "posters"), { recursive: true });
  const images: PosterImages = { small: "", medium: "", large: "" };
  for (const { key, width, height, quality } of sizes) {
    const output = await sharp(source)
      .resize(width, height, { fit: "cover" })
      .webp({ ...webpOptions, quality })
      .toBuffer();
    const hash = createHash("sha256").update(output).digest("hex").slice(0, 16);
    const image = `/posters/${movie.id}-${hash}-${width}w.webp`;
    const destination = join(staticDirectory, image);
    await writeFile(`${destination}.tmp`, output);
    await rename(`${destination}.tmp`, destination);
    images[key] = image;
  }
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(`${cachePath}.tmp`, JSON.stringify({ source: movie.poster_url, day, recipe, images }));
  await rename(`${cachePath}.tmp`, cachePath);
  return images;
}
