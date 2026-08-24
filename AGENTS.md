# Repository Guidelines

## Project Structure & Module Organization

Hashira is a Bun/TypeScript workspace. The Discord bot lives in `apps/bot/src`; its
tests are in `apps/bot/test`. Shared libraries are under `packages/` (`core`, `db`,
`jsx`, `utils`, `yotei`, and others), with package tests in `packages/*/test`.
Prisma models and migrations live in `packages/db/prisma`. Reusable scripts are
kept in `scripts/`, and static font assets in `fonts/`.

Keep feature code close to its domain. For example, Birthday event services,
commands, and views belong in `apps/bot/src/events/birthday2026/`.

## Build, Test, and Development Commands

- `bun install`: install workspace dependencies.
- `bun start` / `bun debug`: run the bot normally or with the inspector.
- `bun run typecheck`: type-check every workspace.
- `bun test`: run all Bun tests; database tests require `DATABASE_TEST_URL`.
- `bun run fix`: lint and organize imports with Biome, then format with oxfmt.
- `bun run format` / `bun run format:check`: format (or verify) with oxfmt.
- `bun prisma-generate`: regenerate the Prisma client after schema changes.
- `bun prisma-migrate-dev --name <name>`: generate and apply a development
  migration. Put unsupported constraints or backfills in a separate follow-up
  migration.
- `bun prisma-check-migrations`: deploy migrations and check schema drift.
- `bun reload-commands`: resync Discord commands after changing command signatures.

## Coding Style & Naming Conventions

Oxfmt enforces formatting (space indentation, an 88-character line width; see
`.oxfmtrc.json`). Biome enforces recommended lint rules and organized imports
(its formatter is disabled). Use TypeScript, `camelCase` for values/functions,
`PascalCase` for types/classes/components, and descriptive domain filenames such as
`inventoryService.ts`. Prefer existing managers and transaction helpers over
feature-local copies. Do not add new Prisma `map:` attributes; existing mappings are
legacy compatibility.

## Testing Guidelines

Use Bun's `describe`, `it`, and `expect`. Name unit files `*.test.ts` or `*.test.tsx`
and database-backed suites `*.database.test.ts`. Add regression tests for failure,
idempotency, rollback, and concurrency boundaries. Run focused tests while iterating,
then `bun test`, `bun run typecheck`, and migration checks before submission.

## Commit & Pull Request Guidelines

Follow Conventional Commit-style subjects seen in history: `feat(scope): ...`,
`fix(scope): ...`, `refactor(scope): ...`, or `docs(scope): ...`. Keep commits and
PRs narrowly scoped. PR descriptions should summarize behavior and list executed
tests; include screenshots for visible Discord UI changes and link relevant issues or
plans. For dependent work, use `gh stack` and keep each PR independently reviewable.

## Security & Configuration

Copy `.env.example` to `.env`; never commit tokens, credentials, or production data.
Use the development Postgres and Redis services described in `README.md`.
