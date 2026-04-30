{ pkgs, inputs, ... }:

let
  bun = inputs.bun.packages.${pkgs.system};
  pkgsPrisma = import inputs.nixpkgs-prisma {
    inherit (pkgs) system;
    overlays = import ./overlays.nix;
  };
  prismaEngines = pkgsPrisma.prisma-engines;
in
{
  dotenv.disableHint = true;

  overlays = import ./overlays.nix;

  packages = with pkgs; [
    bun."1.3.10"
    prismaEngines
    postgresql_17
    openssl
    fontconfig
    gh
    ripgrep
  ];

  languages.javascript = {
    enable = true;
    bun = {
      enable = true;
      package = bun."1.3.10";
      install.enable = true;
    };
  };

  services.postgres = {
    enable = true;
    package = pkgs.postgresql_17;
    listen_addresses = "127.0.0.1";
    port = 5432;
    initialDatabases = [
      { name = "postgres"; }
      { name = "test"; }
    ];
    initialScript = ''
      CREATE ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'postgres';
    '';
  };

  services.redis = {
    enable = true;
    extraConfig = builtins.readFile ./redis.conf;
  };

  env = {
    LD_LIBRARY_PATH = "${pkgs.stdenv.cc.cc.lib}/lib";
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";

    PRISMA_SCHEMA_ENGINE_BINARY = "${prismaEngines}/bin/schema-engine";
    PRISMA_QUERY_ENGINE_BINARY = "${prismaEngines}/bin/query-engine";
    PRISMA_QUERY_ENGINE_LIBRARY = "${prismaEngines}/lib/libquery_engine.node";
    PRISMA_FMT_BINARY = "${prismaEngines}/bin/prisma-fmt";

    REDIS_PORT = "6379";
  };

  enterShell = ''
    FONT_PATH="${pkgs.runCommand "custom-fonts" { } ''
      mkdir -p $out/share/fonts
      cp -r ${./fonts/now} $out/share/fonts/
    ''}"
    export FONTCONFIG_FILE="${pkgs.fontconfig.out}/etc/fonts/fonts.conf"
    export FONTCONFIG_PATH="$FONT_PATH/etc/fonts"
    export XDG_DATA_DIRS="$FONT_PATH/share:$XDG_DATA_DIRS"
    fc-cache -v $FONT_PATH/share/fonts
  '';
}
