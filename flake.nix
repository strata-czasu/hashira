{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    # Bun 1.2.0
    # https://github.com/NixOS/nixpkgs/blob/nixos-unstable/pkgs/by-name/bu/bun/package.nix
    nixpkgs-bun.url = "github:nixos/nixpkgs/a370b2c86fa5c808a57323e3b63a4e022b15670b";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, nixpkgs-bun, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        pkgs-bun = import nixpkgs-bun { inherit system; };
      in
      with pkgs; {
        devShell = mkShell {
          buildInputs = [
            pkgs-bun.bun
          ];
        };
      }
    );
}
