// Draw the night sky behind every page, like the opening of Star Wars:
// mostly faint pinpricks, the odd brighter star with a soft halo, a few
// faintly blue or warm. It tiles, and is drawn once here rather than in the
// browser so it costs the page nothing. Run with `npm run stars`.
import sharp from "sharp";

// Tiles in CSS pixels, drawn at twice that for sharp high-density screens.
// Wide enough that the pattern does not visibly repeat across a window;
// phones get a smaller one, as the large tile takes about 40 MB once decoded.
const TILES = [
  { tile: 1600, out: "src/lib/assets/stars.webp" },
  { tile: 800, out: "src/lib/assets/stars-small.webp" },
];
const SCALE = 2;
const STARS_PER_MEGAPIXEL = 700;

const TINTS = [
  [255, 255, 255],
  [200, 220, 255],
  [255, 240, 215],
] as const;

// mulberry32: small, fast and good enough to scatter stars. Seeded, so the
// sky comes out the same every time.
const random_from = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const draw = async (tile: number, out: string) => {
  const size = tile * SCALE;
  const light = new Float32Array(size * size * 3);

  // A soft round dot, wrapped around the tile's edges so the tiles join.
  const dot = (cx: number, cy: number, radius: number, alpha: number, tint: readonly number[]) => {
    const reach = Math.ceil(radius * 3);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = Math.round(cx) + dx;
        const y = Math.round(cy) + dy;
        const falloff = alpha * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / radius ** 2);
        if (falloff < 0.004) continue;
        const i = (((y + size) % size) * size + ((x + size) % size)) * 3;
        for (let c = 0; c < 3; c++) light[i + c] += falloff * tint[c];
      }
    }
  };

  const random = random_from(1977);
  const count = Math.round((tile * tile * STARS_PER_MEGAPIXEL) / 1e6);
  for (let n = 0; n < count; n++) {
    const x = random() * size;
    const y = random() * size;
    // Skewed so nearly every star is a faint pinprick.
    const radius = (0.5 + random() ** 6 * 1.2) * SCALE;
    const alpha = 0.25 + random() ** 3 * 0.75;
    const tint = random() < 0.85 ? TINTS[0] : TINTS[1 + Math.floor(random() * 2)];
    if (radius > 1.1 * SCALE) dot(x, y, radius * 3, alpha * 0.12, tint);
    dot(x, y, radius, alpha, tint);
  }

  const pixels = Buffer.alloc(size * size * 3);
  for (let i = 0; i < light.length; i++) pixels[i] = Math.min(255, Math.round(light[i]));
  await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
    .webp({ lossless: true })
    .toFile(out);
  console.log(`${count} stars drawn to ${out}`);
};

for (const { tile, out } of TILES) await draw(tile, out);
