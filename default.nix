{
  stdenv,
  pnpm,
  pkgs,
  ...
}:
let
  packageJSON = builtins.fromJSON (builtins.readFile ./package.json);
  version = packageJSON.version;
  pname = packageJSON.name;
in
stdenv.mkDerivation (finalAttrs: {
  inherit version pname;

  nativeBuildInputs = with pkgs; [
    nodejs_20
    pnpm
    pnpm.configHook
  ];

  src = ./.;

  pnpmDeps = pnpm.fetchDeps {
    inherit (finalAttrs) pname src version;
    hash = "sha256-jB4XkkO0wgUdzJ6E4+ImI0oEsJSgQaMqZfszbhLgXNg=";
  };

  installPhase = ''
    runHook preInstall

    pnpm build

    mkdir -p $out
    mv build $out

    runHook postInstall
  '';
})
