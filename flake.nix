{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    # Bun 1.2.0
    # https://github.com/NixOS/nixpkgs/blob/nixos-unstable/pkgs/by-name/bu/bun/package.nix
    nixpkgs-bun.url = "github:nixos/nixpkgs/a370b2c86fa5c808a57323e3b63a4e022b15670b";
    flake-utils.url = "github:numtide/flake-utils";
    devDB = {
      url = "github:hermann-p/nix-postgres-dev-db";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      nixpkgs-bun,
      flake-utils,
      devDB,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        pkgs-bun = import nixpkgs-bun { inherit system; };
        db = devDB.outputs.packages.${system};

        # TODO: Move redis commands to a separate flake
        redis-data-env-var = "$REDIS_DATA";
        check-redis-env = pkgs.writeShellScriptBin "check-redis-env" ''
          if [ -z "${redis-data-env-var}" ]; then
            echo "${redis-data-env-var} is not set, cannot start Redis server."
            exit 1
          fi
        '';
        start-redis = pkgs.writeShellScriptBin "start-redis" ''
          set -e
          ${check-redis-env}/bin/check-redis-env
          if [[ -f ${redis-data-env-var}/redis.pid ]]; then
            echo "Redis server is already running with PID $(cat ${redis-data-env-var}/redis.pid)"
            exit 0
          fi
          if [[ ! -d ${redis-data-env-var} ]]; then
            echo "Creating Redis data directory: ${redis-data-env-var}"
            mkdir -p ${redis-data-env-var}
          fi
          touch ${redis-data-env-var}/redis.log
          ${pkgs.redis}/bin/redis-server \
            --bind 127.0.0.1 \
            --port 6379 \
            --daemonize yes \
            --dir ${redis-data-env-var} \
            --logfile ${redis-data-env-var}/redis.log \
            --pidfile ${redis-data-env-var}/redis.pid
          echo "Redis server started at ${redis-data-env-var}"
        '';
        stop-redis = pkgs.writeShellScriptBin "stop-redis" ''
          set -e
          ${check-redis-env}/bin/check-redis-env
          if [[ ! -f ${redis-data-env-var}/redis.pid ]]; then
            echo "Redis server is not running, no PID file found."
            exit 0
          fi
          redis_pid=$(cat ${redis-data-env-var}/redis.pid)
          echo "Stopping Redis server with PID $redis_pid"
          kill $redis_pid || true
          echo "Redis server stopped."
        '';
      in
      with pkgs;
      {
        devShell = mkShell {
          buildInputs = [
            pkgs-bun.bun
            prisma
            prisma-engines
            postgresql_17
            db.start-database
            db.stop-database
            db.psql-wrapped
            redis
            start-redis
            stop-redis
          ];
          shellHook = ''
            export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib"
            export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig";
            export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
            export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
            export PRISMA_QUERY_ENGINE_LIBRARY="${pkgs.prisma-engines}/lib/libquery_engine.node"
            export PRISMA_FMT_BINARY="${pkgs.prisma-engines}/bin/prisma-fmt"
            export PG_ROOT=$(git rev-parse --show-toplevel)
            export REDIS_DATA=$(git rev-parse --show-toplevel)/REDIS_DATA
          '';
        };
      }
    );
}
