Fljótlegt yfirlit yfir bíódagskrá kvöldsins á öllu landinu.

## Development

Requires Bun 1.4 or newer. `nix develop` provides the version pinned by `flake.lock`
(currently 1.4.2).

```sh
nix develop
bun install --frozen-lockfile
bun run scrape
bun run dev
```

Run `bun run check`, `bun test`, and `bun run build` to validate changes. Scraping
provides the movie data required by the app; for checks without live data, create
`static/movies.json` containing `[]`.

Sharp remains necessary for the posters' centered `cover` cropping and WebP
encoding options, which Bun.Image does not yet support. Svelte Check's `--tsgo`
mode needs both TypeScript 6 and the TypeScript 7 alias in `package.json`.

## Scraper caches

The deployment workflow restores generated posters and their metadata from
GitHub Actions Cache. They are reused for the same source URL within a UTC day;
missing outputs, a new source URL, or encoder changes regenerate them. Changes
at an unchanged source URL are picked up on the next day's refresh. Encoded
posters have content-hashed filenames and can be cached by browsers for a year.

The IMDb gzip dataset has a separate daily Actions cache. `IMDB_RATINGS_FILE`
points the scraper at that file; without it, local scrapes stream the download.
Both paths decompress and parse incrementally. Showtime metadata retains its
existing cache and is refreshed for newly encountered booking URLs.

Locally, poster metadata follows `XDG_CACHE_HOME`, defaulting to
`~/.cache/hvaderibio/posters`. The workflow sets `XDG_CACHE_HOME` to the workspace's
`.cache` directory. Cache metadata and the IMDb dataset are not published.

Scraping permits one active request per hostname, with at least 200 ms between
request starts, including redirects. At most four movies are enriched and two
posters encoded at a time.
