{
  lib,
  buildNpmPackage,
  importNpmLock,
  nodejs_24,
  # Directory holding a scraped movies.json and its WebP posters. The catalog
  # is fetched from the network and gitignored, so it cannot come from the
  # flake source; without one the site builds with no movies.
  catalog ? null,
}:

buildNpmPackage {
  pname = "hvaderibio";
  version = (lib.importJSON ./package.json).version;

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./package.json
      ./package-lock.json
      ./vite.config.ts
      ./tsconfig.json
      ./src
      ./static/_headers
      ./static/favicon.ico
      ./static/fonts
      ./static/letterboxd.svg
      ./static/metacritic.svg
      ./static/robots.txt
      ./static/rotten-tomatoes.svg
    ];
  };

  nodejs = nodejs_24;
  npmDeps = importNpmLock { npmRoot = ./.; };
  inherit (importNpmLock) npmConfigHook;

  # Matches a local `npm install`, which leaves install scripts unapproved.
  npmFlags = [ "--ignore-scripts" ];
  dontNpmRebuild = true;

  # Set only for the build: during install it would make npm skip the
  # devDependencies that the build needs.
  preBuild = ''
    export NODE_ENV=production
  ''
  + (
    if catalog == null then
      ''
        echo '[]' > static/movies.json
      ''
    else
      ''
        cp ${catalog}/movies.json static/
        cp ${catalog}/*.webp static/
      ''
  );

  installPhase = ''
    runHook preInstall
    cp -r build $out
    runHook postInstall
  '';

  # Pages serves this directory as is: every page prerendered, unknown paths
  # answered by 404.html, and no worker to bundle at upload time.
  doInstallCheck = true;
  installCheckPhase = ''
    runHook preInstallCheck
    for page in index.html 404.html sitemap.xml _headers; do
      test -f "$out/$page" || { echo "missing $page"; exit 1; }
    done
    if test -e "$out/_worker.js"; then echo "unexpected _worker.js"; exit 1; fi
    runHook postInstallCheck
  '';

  meta = {
    description = "Hvað er í bíó?";
    license = lib.licenses.mit;
  };
}
