# Devbox Development Environment

This project supports two independent development setups:

1. **Devbox** (this file) — isolated Nix-based shell with local PostgreSQL + Redis
2. **Nix Flakes** — your colleague's workflow via `flake.nix` + `direnv`

The two setups do not interfere with each other.

---

## What Changed

### Deleted
- `.devcontainer/` — entire directory removed (Dockerfile, devcontainer.json, docker-compose.yml)

### Created
- **`devbox.json`** — your new isolated development environment config
- **`devbox.lock`** — generated automatically by `devbox install`

### Modified
- **`.vscode/extensions.json`** — added `jetify-com.devbox` to recommendations
- **`.env.example`** — updated comments to document both Dev Container and Devbox connection URLs

### Untouched
- `flake.nix`, `overlays.nix`, `.envrc` — your colleague's workflow is unaffected
- `docker-compose.yml`, `Dockerfile` — production builds unchanged

---

## First-Time Setup (One-Time)

### 1. Install Devbox

```bash
curl -fsSL https://get.jetify.com/devbox | bash
```

### 2. Generate the Lock File

```bash
cd /path/to/hashira
devbox install
```

This creates `devbox.lock` and downloads all packages into the Nix store.

### 3. Set Up Your `.env`

```bash
cp .env.example .env
```

Then edit `.env` and uncomment the **Devbox** lines:

```env
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://hashira:pass@localhost:5432/hashira
DATABASE_TEST_URL=postgresql://hashira:pass@localhost:5432/hashira_test
```

### 4. Initialize the Database

```bash
devbox run setup-db
```

This runs `initdb`, creates the `hashira` user + both databases, then stops PostgreSQL so you can start it cleanly.

---

## Daily Workflow

### Start services (PostgreSQL + Redis)

```bash
devbox services up -b
```

They now run as background processes on your host (no Docker).

### Enter your dev environment

```bash
devbox shell
```

Inside the shell you have: `bun`, `psql`, `redis-cli`, `gh`, `ripgrep`, etc.

```bash
bun install   # install node deps
bun start     # start the bot
bun typecheck # typecheck workspaces
```

### Stop services

```bash
devbox services stop
```

---

## VSCode Integration

1. Install the **Devbox** extension (`jetify-com.devbox`) — it should be recommended when you open the project
2. Command Palette → `Devbox: Reopen in Devbox shell environment`
3. VSCode reloads with your devbox environment active; the integrated terminal auto-enters `devbox shell`

---

## Available Devbox Scripts

| Script | Command |
|--------|---------|
| `devbox run setup-db` | Init PostgreSQL + create user & databases |
| `devbox run install-deps` | `bun install` |
| `devbox run dev` | `bun run --cwd apps/bot start` |
| `devbox run start` | Same as `dev` |
| `devbox run typecheck` | `bun --workspaces typecheck` |

---

## Architecture Notes

- **Single PostgreSQL instance**, two databases (`hashira`, `hashira_test`) — simpler than the old Docker Compose setup
- **No `.envrc` changes** — your colleague's `use flake` direnv activation is untouched
- **Fonts** — `fc-cache` runs automatically in the `init_hook` when you enter `devbox shell`
- **Services** — managed by `process-compose` under the hood; they survive shell exit when started with `-b`

---

## Troubleshooting

### `devbox: command not found`

Ensure `~/.local/bin` is in your `$PATH`.

### PostgreSQL won't start / port 5432 in use

Another Postgres might be running. Check with `lsof -i :5432` and stop it, or run `devbox services stop` first.

### Prisma can't find query engine

The devcontainer didn't pin Prisma engines either. If needed, we can add `prisma-engines` from Nix later.

### Want to go back to the flake setup temporarily?

Just use your colleague's workflow: `nix develop` (or let direnv handle it). The two setups are completely independent.
