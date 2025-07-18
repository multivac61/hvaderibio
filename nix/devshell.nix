{ pkgs }:
pkgs.mkShell {
  # Add build dependencies
  packages = with pkgs; [
    pnpm
    nodejs_20
  ];

  # Add environment variables
  env = { };

  # Load custom bash code
  shellHook = ''

  '';
}
