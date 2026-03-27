{ pkgs, lib, config, inputs, ... }:

let
  bunPackages = inputs.bun.packages.${pkgs.stdenv.system};
  fontPath = pkgs.runCommand "custom-fonts" { } ''
    mkdir -p $out/share/fonts
    cp -r ${./fonts/now} $out/share/fonts/
  '';
  postgresPort = toString config.processes.postgres.ports.main.value;
  redisPort = toString config.processes.redis.ports.main.value;
  currentUser = builtins.getEnv "USER";
  currentHost = builtins.getEnv "HOSTNAME";
in
{
  overlays = import ./overlays.nix;

  packages = with pkgs; [
    bunPackages."1.3.10"
    prisma-engines
    postgresql_17
    openssl
    redis
    fontconfig
  ];

  env = {
    DATABASE_URL = "postgresql://hashira:hashira@127.0.0.1:${postgresPort}/hashira";
    DATABASE_TEST_URL = "postgresql://hashira:hashira@127.0.0.1:${postgresPort}/hashira_test";
    REDIS_URL = "redis://127.0.0.1:${redisPort}";

    LD_LIBRARY_PATH = "${pkgs.stdenv.cc.cc.lib}/lib";
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
    PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";
    PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
    PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.node";
    PRISMA_FMT_BINARY = "${pkgs.prisma-engines}/bin/prisma-fmt";

    FONT_PATH = "${fontPath}";
    FONTCONFIG_FILE = "${pkgs.fontconfig.out}/etc/fonts/fonts.conf";
    FONTCONFIG_PATH = "${fontPath}/etc/fonts";
  };

  enterShell = ''
    export XDG_DATA_DIRS="$FONT_PATH/share:$XDG_DATA_DIRS"
    fc-cache -v "$FONT_PATH/share/fonts"

    echo "Use 'devenv up -d' to keep PostgreSQL and Redis running in the background."
  '';

  # All developers run local databases from the shared base config.
  services.postgres = {
    enable = true;
    package = pkgs.postgresql_17;
    listen_addresses = "127.0.0.1";
    port = 5432;
    initialDatabases = [
      {
        name = "hashira";
        user = "hashira";
        pass = "hashira";
      }
      {
        name = "hashira_test";
        user = "hashira";
        pass = "hashira";
      }
    ];
  };

  services.redis = {
    enable = true;
    bind = "127.0.0.1";
    port = 6379;
  };

  # Custom profiles are based on username/hostname, not role.
  profiles = {
    user = lib.optionalAttrs (currentUser != "") {
      "${currentUser}".module = {
        env.HASHIRA_PROFILE_USER = currentUser;
      };
    };
    hostname = lib.optionalAttrs (currentHost != "") {
      "${currentHost}".module = {
        env.HASHIRA_PROFILE_HOST = currentHost;
      };
    };
  };
}
