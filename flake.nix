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
            prisma
            prisma-engines
          ];
          shellHook = ''
            export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib"
            export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig";
            export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
            export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
            export PRISMA_QUERY_ENGINE_LIBRARY="${pkgs.prisma-engines}/lib/libquery_engine.node"
            export PRISMA_FMT_BINARY="${pkgs.prisma-engines}/bin/prisma-fmt"
          '';
        };
      }
    );
}
