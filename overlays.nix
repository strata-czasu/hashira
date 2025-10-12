let
  # https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/pr/prisma-engines/package.nix
  prisma-engines = (
    final: prev: {
      prisma-engines = prev.prisma-engines.overrideAttrs (prevAttrs: rec {
        # Version kept up to date with packages/db/package.json -> dependencies -> @prisma/client
        version = "6.17.1";
        src = prev.fetchFromGitHub {
          owner = "prisma";
          repo = "prisma-engines";
          rev = version;
          hash = "sha256-6iLPJUe9RMGn1sf6EsU7Ainbe8Reo8eMufdOIb0j54A=";
        };
        cargoHash = "sha256-1c15l1ZkE/NLAAaFZEEP4WUACc1IcLJ5tDJfMgmtogQ=";
        cargoDeps = prev.rustPlatform.fetchCargoVendor {
          inherit (prevAttrs) pname;
          inherit src version;
          hash = cargoHash;
        };
      });
    }
  );
in
[
  prisma-engines
]
