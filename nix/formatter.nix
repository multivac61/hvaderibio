{
  flake,
  inputs,
  pkgs,
  ...
}:
let
  treefmtEval = inputs.treefmt-nix.lib.evalModule pkgs {
    projectRootFile = "flake.nix";

    programs.deadnix.enable = true;
    programs.nixfmt.enable = true;

    programs.shellcheck.enable = true;
    programs.shfmt.enable = true;

    settings.formatter.shfmt.includes = [ "*.envrc" ];

    settings.formatter.deadnix.pipeline = "nix";
    settings.formatter.deadnix.priority = 1;
    settings.formatter.nixfmt.pipeline = "nix";
    settings.formatter.nixfmt.priority = 2;

    settings.formatter.shellcheck.pipeline = "shell";
    settings.formatter.shellcheck.priority = 1;
    settings.formatter.shfmt.pipeline = "shell";
    settings.formatter.shfmt.priority = 2;

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
  formatter = treefmtEval.config.build.wrapper;
  check = treefmtEval.config.build.check flake;
in
formatter
// {
  passthru = formatter.passthru // {
    tests = {
      inherit check;
    };
  };
}
