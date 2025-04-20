{ pkgs }:
pkgs.mkShell {
  # Add build dependencies
  packages = with pkgs; [
    pnpm
  ];

  # Add environment variables
  env = { };

  # Load custom bash code
  shellHook = ''

  '';
}
