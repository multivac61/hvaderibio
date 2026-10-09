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

Run `npm run check`, `npm test`, and `npm run build` to validate changes.
Scraping provides the movie data required by the app; for checks without live
data, create `static/movies.json` containing `[]`.
