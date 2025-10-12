let
  # https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/pr/prisma-engines/package.nix
  prisma-engines = (
    final: prev: {
      prisma-engines = prev.prisma-engines.overrideAttrs (prevAttrs: rec {
        # Version kept up to date with packages/db/package.json -> dependencies -> @prisma/client
        version = "6.16.2";
        src = prev.fetchFromGitHub {
          owner = "prisma";
          repo = "prisma-engines";
          rev = version;
          hash = "sha256-20ptm8k63vl7m4sCUzk8BB4x2B1RSdJsyJo3ibbSeHo=";
        };
        cargoHash = "sha256-tNsc6z0CC5Cvj6tJBSXxV4D3ql7Ji3NCOn8NCVE3Ymg=";
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
