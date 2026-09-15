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
