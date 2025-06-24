# hashira

## Development

### Prerequisites

1. Create an application on the [Discord Developer Portal](https://discord.com/developers/applications)
2. Add a "Bot" to the application and copy its token (required for `BOT_TOKEN`)
3. Enable all "Privileged Gateway Intents"
4. Copy the "Client ID" from the "OAuth2" page (required for `BOT_CLIENT_ID`)
5. Go to the "Installation" page
   1. Under "Installation Contexts" select "Guild Install"
   2. Under "Install Link" select "Discord Provided Link"
   3. Under "Default Install Settings" select `applications.commands` and `bot` scopes with `Administrator` permissions
   4. The generated link under "Install Link" should allow you to invite the bot to your server
6. Invite the bot to a server you will be using for development
7. Take note of the server ID (required for `BOT_DEVELOPER_GUILD_IDS`)

The `apps/bot/seed.ts` file contains basic data that is loaded into the database by `bun seed`. It sources some default settings from `apps/bot/src/specializedConstants.ts`.

`bun reload-commands` needs to be ran every time a change is made to command signatures, e.g. changing a name, parameter, creating a new command or deleting a command. The `reload-commands` script syncs commands to guilds set in `BOT_DEVELOPER_GUILD_IDS`. This step can be skipped if only command handlers are changed or any other code that wouldn't change a command's signature.

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

5. Sync commands to discord - `bun reload-commands`

6. Start the bot - `bun start`

### Nix

1. Copy `.env.example` to `.env` and set the following variables:
   - `BOT_TOKEN`
   - `BOT_CLIENT_ID`
   - `BOT_DEVELOPER_GUILD_IDS`
   - `REDIS_URL=redis://localhost:6379`
   - `DATABASE_URL=postgresql://username@localhost:5432/dev`
   - `DATABASE_TEST_URL=postgresql://username@localhost:5432/test`
   - `POSTGRES_*` vars can be removed - they are only used when initializing a DB via Docker
   - **Optionally** set vars from the "Optional settings" section if needed

2. Activate the devShell
   - Use `direnv allow` to automatically go into a devShell and load the `.env` file, or
   - Activate the shell manually with `nix develop` and load the `.env` file manually (e.g. by sourcing it)

3. Install dependencies - `bun install`

4. Start development databases - `start-database && start-redis`

5. Setup the database:
   - `bun prisma-generate` - generate the Prisma DB client
   - `bun prisma-migrate-deploy` - sync the schema
   - `bun seed` - insert required data

6. Sync commands to discord - `bun reload-commands`

7. Start the bot - `bun start`

8. When you're finished, stop development databases - `stop-database && stop-redis`
