# hashira

## Development

### VSCode Dev Container (recommended)

Using VSCode Dev containers is the easiest way to setup the development environment with required tools and services. You need the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) and [Docker](https://www.docker.com/) to start using them.

1. Copy `.env.example` to `.env` and set the following variables:
   - `BOT_TOKEN`
   - `BOT_CLIENT_ID`
   - `BOT_DEVELOPER_GUILD_IDS`
   - **Don't change** `REDIS_URL`, `DATABASE_*` and `POSTGRES_*` - they are setup to work out of the box in Dev Containers
   - **Optionally** set vars from the "Optional settings" section if needed

2. Run "Dev Containers: Reopen in Container". VSCode should build an image with Docker and start required services (Postgres, Redis).

3. Dependencies should be installed automatically on container creation, but you can install them manually with `bun install`

4. Setup the database:
   - `bun prisma-generate` - generate the Prisma DB client
   - `bun prisma-migrate-deploy` - sync the schema
   - `bun seed` - insert required data

5. Start the bot - `bun start`

### Nix

1. Copy `.env.example` to `.env` and set the following variables:
   - `BOT_TOKEN`
   - `BOT_CLIENT_ID`
   - `BOT_DEVELOPER_GUILD_IDS`
   - `REDIS_URL=redis://localhost:6379`
   - `DATABASE_URL=postgresql://username@localhost:5432/dev`
   - `DATABASE_TEST_URL=postgresql://username@localhost:5432/dev`
   - `POSTGRES_*` vars can be removed - they are only used when initializing a DB via Docker

2. Run `direnv allow` to automatically go into a nix shell or run it manually. Direnv should activate a nix shell and load the `.env` file

3. Install dependencies - `bun install`

4. Start development databases - `start-database && start-redis`

5. Setup the database:
   - `bun prisma-generate` - generate the Prisma DB client
   - `bun prisma-migrate-deploy` - sync the schema
   - `bun seed` - insert required data

6. Start the bot - `bun start`

7. When you're finished, stop development databases - `stop-database && stop-redis`
