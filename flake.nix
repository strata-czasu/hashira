{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    bun = {
      url = "github:Daste745/nix-bun";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    postgres-dev-db = {
      url = "github:hermann-p/nix-postgres-dev-db";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    redis-dev-db = {
      url = "github:Daste745/nix-redis-dev-db";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
      eachSupportedSystem =
        f:
        inputs.nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            inherit system;
            pkgs = import inputs.nixpkgs {
              inherit system;
              overlays = import ./overlays.nix;
            };
          }
        );
    in
    {
      devShells = eachSupportedSystem (
        { system, pkgs }:
        let
          postgres-dev-db = inputs.postgres-dev-db.outputs.packages.${system};
          redis-dev-db = inputs.redis-dev-db.outputs.packages.${system};
          bun = inputs.bun.packages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              bun."1.3.10"
              prisma-engines
              postgresql_17
              openssl
              postgres-dev-db.start-database
              postgres-dev-db.stop-database
              postgres-dev-db.psql-wrapped
              redis
              redis-dev-db.start-redis
              redis-dev-db.stop-redis
              redis-dev-db.redis-cli-wrapped
              fontconfig
            ];
            FONT_PATH = pkgs.runCommand "custom-fonts" { } ''
              mkdir -p $out/share/fonts
              cp -r ${./fonts/now} $out/share/fonts/
            '';
            shellHook = ''
              export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib"
              export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig";
              export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
              export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
              export PRISMA_QUERY_ENGINE_LIBRARY="${pkgs.prisma-engines}/lib/libquery_engine.node"
              export PRISMA_FMT_BINARY="${pkgs.prisma-engines}/bin/prisma-fmt"

              export PG_ROOT=$(git rev-parse --show-toplevel)
              export REDIS_DATA=$(git rev-parse --show-toplevel)/REDIS_DATA
              export REDIS_PORT=6379

              export FONTCONFIG_FILE="${pkgs.fontconfig.out}/etc/fonts/fonts.conf"
              export FONTCONFIG_PATH="$FONT_PATH/etc/fonts"
              export XDG_DATA_DIRS="$FONT_PATH/share:$XDG_DATA_DIRS"
              fc-cache -v $FONT_PATH/share/fonts
            '';
          };
        }
      );
    };
}
