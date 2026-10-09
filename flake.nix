{
  description = "Hvað er í bíó?";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs?ref=nixos-unstable";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      treefmt-nix,
      systems,
    }:
    let
      eachSystem =
        f: nixpkgs.lib.genAttrs (import systems) (system: f system nixpkgs.legacyPackages.${system});

      systemOutputs = eachSystem (
        _system: pkgs:
        let
          hvaderibio = pkgs.callPackage ./package.nix { };
          treefmtEval = treefmt-nix.lib.evalModule pkgs {
            programs.deadnix.enable = true;
            programs.nixfmt.enable = true;

            programs.shellcheck.enable = true;
            programs.shfmt.enable = true;

            settings.formatter.shfmt.includes = [ "*.envrc" ];

            settings.global.excludes = [
              "*.png"
              "*.jpg"
              "*.zip"
              "*.touchosc"
              "*.pdf"
              "*.svg"
              "*.ico"
              "*.webp"
              "*.gif"
            ];
          };
        in
        {
          formatter = treefmtEval.config.build.wrapper;
          checks = {
            formatting = treefmtEval.config.build.check self;
            package = hvaderibio;
            # Type checks, lint and unit tests need the whole tree, not just
            # the files the site is built from.
            npm = hvaderibio.overrideAttrs {
              pname = "hvaderibio-npm-check";
              src = self;
              preBuild = "echo '[]' > static/movies.json";
              buildPhase = ''
                runHook preBuild
                npm run check
                npm test
                runHook postBuild
              '';
              installPhase = "touch $out";
            };
          };
          packages.default = hvaderibio;
          devshell.default = pkgs.mkShell {
            inputsFrom = [ hvaderibio ];
          };
        }
      );
    in
    {
      packages = nixpkgs.lib.mapAttrs (_system: outputs: outputs.packages) systemOutputs;
      devShells = nixpkgs.lib.mapAttrs (_system: outputs: outputs.devshell) systemOutputs;
      formatter = nixpkgs.lib.mapAttrs (_system: outputs: outputs.formatter) systemOutputs;
      checks = nixpkgs.lib.mapAttrs (_system: outputs: outputs.checks) systemOutputs;
    };
}
