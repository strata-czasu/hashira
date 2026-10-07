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

Run `bun reload-commands` when adding or changing command signatures. The script creates or updates individual commands in `BOT_DEVELOPER_GUILD_IDS`, preserving registrations it does not define. Removing a definition or syncing an empty catalog does not delete commands from Discord; delete retired registrations explicitly. Renaming a command leaves the old registration behind. Changes limited to handlers do not require registration.

### Running alongside Kasutera

Both runtimes can share a Discord application and use separate databases. Give each runtime disjoint command definitions, or set `DISCORD_COMMAND_OWNERSHIP_FILE` to the same ownership JSON file in both deployments:

```json
{
  "applicationId": "123456789012345678",
  "defaultOwner": "hashira",
  "commands": [
    {
      "guildId": "234567890123456789",
      "type": 1,
      "name": "confirm",
      "owner": "kasutera"
    }
  ]
}
```

Replace the IDs and names with your application, guild and commands. Types are `1` for slash commands, `2` for user menus and `3` for message menus. Ownership covers the whole root command, including subcommands. Explicit entries override `defaultOwner`; omit the default to require explicit assignments for every command. Hashira validates the entire local catalog in all targeted guilds before any registration writes. Invalid files, wrong application IDs and foreign/unassigned commands abort registration, and Discord failures propagate to the caller.

The file validates registration; it does not filter command handlers or event listeners. To transfer a command, remove its definition and handler from the old runtime, update the ownership file, then register it in the new runtime. Keep general event handlers disjoint as features move. Without an ownership file, both runtimes defining the same type/name can still overwrite each other. The sync never uses bulk replacement or automatic deletion, including for an empty local catalog.

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

### Updating Bun

Use the helper script in `scripts/bunVersion.ts` anytime you need to bump the Bun runtime. It updates the devcontainer image, production Dockerfile, CI workflow, Nix shell, and the `@types/bun` dev dependency so everything stays in sync.

```bash
# To preview changes without writing them:
bun bump 1.4.0 --dry-run

# To execute the changes
bun bump 1.4.0

# Afterwards refresh dependencies to update bun.lock
bun install
```
