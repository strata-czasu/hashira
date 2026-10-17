# Bun single-binary compile — research synthesis

Revives #243 (`bun build --compile` into a minimal runtime image). Everything
below was verified empirically on bun **1.4.0** (Rust rewrite release) against
this repo, Aug 2026.

## TL;DR

- The original blocker ("sharp needs .node files, compile doesn't bundle them")
  is **solvable**: a ~20-line bundler plugin embeds sharp's native addon, and
  the compiled binary runs the full bot (proven: Redis + gateway connect).
- The new blocker is **Coolify hooks**: pre/post-deploy commands run via
  `docker exec sh -c`, which rules out `distroless` and requires keeping
  `sh` + `bun` + prisma CLI payload in the image. This shrinks the payoff from
  "tiny distroless image" to "faster startup, lower idle resources".
- Prisma 7.8 exposes **no public TS API for migrations**; the pragmatic path is
  running the real CLI in the runtime image (it works there today).

## Verified facts

| # | finding | evidence |
|---|---------|----------|
| F1 | `bun build --compile` does NOT auto-embed sharp's native addon | bare-specifier requires (`require("@img/sharp-linux-x64/sharp.node")`) are left unresolved at runtime → `Could not load the "sharp" module using the linux-x64 runtime` |
| F2 | Bun DOES embed `.node` files required by **direct file path** | docs "Embed N-API Addons" + local test: binding loads from `/$bunfs/root/...node` |
| F3 | Embedded addon fails dlopen on `libvips-cpp.so` | its `$ORIGIN` rpaths point nowhere inside bun's extraction root |
| F4 | `LD_LIBRARY_PATH=<libvips libdir>` fixes F3 | svg→png through full sharp API succeeded in compiled binary |
| F5 | Full bot binary: 90 MB (~77 MB is bun itself), builds in ~0.5 s | `/tmp/opencode/hashira-bin`, smoke test: `Connected to Redis` + `Bot is ready` |
| F6 | `sharp` 0.35 ships rpath entries anticipating bun's `.bun` store layout | `readelf -d` on `@img/sharp-linux-x64/lib/*.node` |
| F7 | `Bun.Image` cannot replace sharp here | `ERR_IMAGE_UNKNOWN_FORMAT` for SVG (no vector renderer); no animated WebP/GIF support at all (profile needs SVG→PNG, giveaway needs animated resize) |
| F8 | Compiling prisma CLI = rabbit hole | dynamic engine lookups externalized; alias plugin can't intercept non-static specifiers |
| F9 | No public TS migrate API in Prisma 7.8 | `@prisma/internals` package gone; nothing exported from `prisma` / `@prisma/config`; only internal `schema_engine_bg.wasm` in CLI bundle |
| F10 | Coolify hooks execute as `docker exec … sh -c` in old/new container | kills distroless; post-deploy `bun reload-commands` also needs bun+sources |

## The sharp embedding recipe (works today)

Build plugin (key part):

```ts
const result = await Bun.build({
  entrypoints: ["apps/bot/src/index.ts"],
  compile: { outfile: "./dist/hashira", target: `bun-linux-${arch}` }, // arch = process.arch of BUILD machine
  minify: { whitespace: true, syntax: true },
  plugins: [{
    name: "embed-sharp",
    setup(build) {
      // NOTE: fires on sharp.mjs when app is ESM (cjs variant exists too)
      build.onLoad({ filter: /dist[/\\]sharp\.m?c?js$/ }, async (args) => {
        const src = await Bun.file(args.path).text();
        const needle = 'sharp = require("@img/sharp-linux-' + arch + '/sharp.node");';
        if (!src.includes(needle)) return undefined; // other platform's build
        return {
          contents: src.replace(needle,
            "sharp = require(" + JSON.stringify(NODE_PATH + "/lib/sharp-" + arch + "-<ver>.node") + ");"),
          loader: "js",
        };
      });
    },
  }],
});
```

Where `NODE_PATH` = absolute path to `node_modules/.bun/@img+sharp-linux-<arch>@<ver>/node_modules/@img/sharp-linux-<arch>`.

Runtime requirement: ship `@img/sharp-libvips-linux-<arch>/lib/` alongside and
set `LD_LIBRARY_PATH` to it. In Docker:

```dockerfile
FROM oven/bun:${BUN_VERSION}-slim AS build
# ... install deps, compile binary with script above ...
RUN cp -r node_modules/.bun/@img+sharp-libvips-linux-*@*/node_modules/@img/sharp-libvips-linux-*/lib /opt/vips

FROM oven/bun:${BUN_VERSION}-slim   # NOT distroless (F10)
COPY --from=build /opt/vips /opt/vips
COPY --from=build /app/dist/hashira /usr/local/bin/hashira
ENV LD_LIBRARY_PATH=/opt/vips
CMD ["hashira"]
```

Multi-arch note: CI (native `ubuntu-24.04-arm` runner since #313) executes each
platform's docker build natively, so `process.arch` at build time already equals
the target arch. Optional deps follow the executing platform, so the correct
`@img/sharp-linux-arm64` is present automatically. No cross-compilation needed.

## Measured gains (bun 1.4 idle profiling, connected to gateway)

| metric      | 1.3.14 | 1.4.0 | Δ |
|-------------|--------|-------|---|
| CPU avg     | 2.80%  | 0.87% | −69% |
| RSS avg     | 258 MB | 216 MB | −16% |

(Compiled-binary numbers expected similar or better; not yet measured.)

## Constraints that shaped the plan

1. **Coolify hooks** (pre-deploy migrate, post-deploy reload-commands) need
   `sh` + `bun` + node_modules-for-prisma-CLI in the *runtime* image.
2. Therefore runtime base stays `oven/bun:${BUN_VERSION}-slim`
   (+ openssl, fontconfig, fonts as today). Distroless/cc is off the table.
3. Migrations keep using the real CLI: keep `packages/db` + prisma deps +
   migrations dir in the image; hooks unchanged.

## Options considered

| option | verdict |
|--------|---------|
| A. custom SQL migrator embedded in binary (maintains `_prisma_migrations`) | rejected for now — own-code risk, low value while CLI fits anyway |
| B. two images (bot-only distroless + migrate image) | rejected — Coolify hooks make distroless unusable regardless |
| C. compiled bot + CLI-capable slim runtime | **chosen direction** |

## Next steps

- [ ] `scripts/buildBinary.ts`: arch-aware version of the verified plugin/build script (currently only in /tmp — recreate!)
- [ ] subcommand router idea (optional): `hashira reload-commands` so post-deploy hook stops needing source tree
- [ ] Dockerfile multi-stage per sketch above; measure before/after image size + boot time
- [ ] arm64 verification on native runner (first CI run after merge)
- [ ] consider upstreaming the sharp-embed recipe (bun docs lack native-addon guidance; sharp already ships bun-layout rpaths — see F6)

## Related

- #243 — original WIP (Dockerfile multi-stage sketch, TODO about sharp)
- #309/#310/#311/#312/#313 — groundwork merged along the way (bun 1.4, native arm64 CI)
- Bun docs: executables (Embed N-API Addons / Embed directories), Bun.Image
- Prisma Bun guide §7 compiles only the app; migrations stay outside the artifact
