# DEVENV.md — Development Environment with devenv

This document describes the standalone devenv-based development workflow.
It lives alongside the existing Nix Flake setup (`flake.nix`) and the legacy DevContainer configuration (`.devcontainer/`).

> **Important:** This setup is completely separate from the shared `flake.nix`. Your colleague’s workflow is unaffected.

---

## Prerequisites

1. **Nix** installed ([installer](https://nixos.org/download.html))
2. **devenv CLI** installed:
   ```bash
   nix-env --install --attr devenv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable
   ```

---

## First-Time Setup

### 1. Update `.env` connection strings

Because devenv runs services on `localhost` instead of inside Docker containers, update the following lines in your **local** `.env` file (`.env` is gitignored, so this won’t affect your colleague):

```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"
DATABASE_TEST_URL="postgresql://postgres:postgres@127.0.0.1:5432/test"
REDIS_URL="redis://127.0.0.1:6379"
```

### 2. Enter the shell

```bash
devenv shell
```

This downloads all inputs, builds the environment, installs Bun dependencies, and drops you into a subshell with everything configured.

### 3. Start background services

```bash
devenv up -d
```

This starts PostgreSQL and Redis in the background.

---

## Daily Workflow

| Task | Command |
|------|---------|
| Enter dev shell | `devenv shell` |
| Start services (foreground) | `devenv up` |
| Start services (background) | `devenv up -d` |
| Stop background services | `devenv processes down` |
| Update devenv inputs | `devenv update` |
| Show environment info | `devenv info` |

---

## What’s Included

- **Bun 1.3.10** (same version as DevContainer & Flake)
- **PostgreSQL 17** with two initial databases:
  - `postgres` — main development database
  - `test` — test database
- **Redis** using the project’s own `redis.conf`
- **Prisma engines 6.16.2** (via existing `overlays.nix`)
- **Fontconfig** with project fonts (`fonts/now`)
- **GitHub CLI (`gh`)** and **ripgrep**
- All required `PRISMA_*` and `LD_LIBRARY_PATH` environment variables

---

## Files Added

| File | Purpose |
|------|---------|
| `devenv.yaml` | Input declarations (`nixpkgs`, `nix-bun`, plus a pinned `nixpkgs-prisma` for Prisma engines) |
| `devenv.nix` | Full environment, services, packages, and shell hooks |
| `devenv.lock` | Lock file for devenv inputs (generated, gitignored) |
| `DEVENV.md` | This document |

### Why the extra `nixpkgs-prisma` input?

`prisma-engines` 6.16.2 needs a very specific Rust/Cargo version to compile:
Too new (`nixos-unstable` at the time of writing) → lifetime errors in the `metrics` crate

The `nixpkgs-prisma` input pins the exact same `nixpkgs` revision the `flake.lock` already uses, so Prisma engines build reliably while everything else stays on latest unstable.

---

## Updating the Bun Version

The version bump script (`scripts/bunVersion.ts`) now also updates `devenv.nix`.

```bash
bun ./scripts/bunVersion.ts 1.4.0
```

---

## Troubleshooting

### Services fail to start

devenv persists service data to `.devenv/state/`. If you change Postgres or Redis settings and they don’t take effect, delete the state directory:

```bash
rm -rf .devenv/state/postgres
rm -rf .devenv/state/redis
```

Then run `devenv up` again.

### `.env` variables still point to Docker hosts

Make sure your `.env` uses `127.0.0.1` (not `db`, `test-db`, or `redis`) for local service URLs.

### Conflict with `flake.nix` shell

If you accidentally enter the Flake shell (`nix develop`) instead of the devenv shell, just exit and run `devenv shell`. The two environments are independent.
