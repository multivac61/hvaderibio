Fljótlegt yfirlit yfir bíódagskrá kvöldsins á öllu landinu.

## Development

Requires Node.js 24 or newer. `nix develop` provides the version pinned by
`flake.lock`.

```sh
nix develop
npm ci
npm run scrape
npm run dev
```

Run `npm run check` and `npm test` while iterating; `nix flake check` runs both
plus the site build, as CI does. Scraping provides the movie data required by the
app; for checks without live data, create `static/movies.json` containing `[]`.

`nix build` produces the Cloudflare Pages output with an empty catalog, since the
scraped `static/movies.json` and posters are gitignored and invisible to the
flake. To build with them, pass the catalog directory explicitly:

```sh
nix build --impure --expr \
  "(builtins.getFlake \"git+file://$PWD\").packages.x86_64-linux.default.override { catalog = $PWD/static; }"
```
