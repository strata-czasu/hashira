# Hashira Discord Bot - AI Coding Instructions

## Architecture Overview

This is a **TypeScript monorepo** using **Bun** as the runtime and package manager, built around a custom Discord bot framework called **Hashira**. The project follows a modular, type-safe architecture with strict separation of concerns.

### Core Components

- **`packages/core`**: Custom Discord bot framework with type-safe command builders, event handlers, and dependency injection
- **`packages/db`**: Prisma-based database layer with Redis integration and custom pagination utilities  
- **`packages/env`**: Centralized environment variable validation and typing
- **`packages/paginate`**: Reusable pagination abstractions for database queries and static data
- **`packages/utils`**: Shared TypeScript utilities and type helpers
- **`apps/bot`**: Main Discord bot application consuming all packages

### Key Patterns

**Hashira Framework Usage**: Every feature is built as a Hashira module using the builder pattern:
```typescript
export const myFeature = new Hashira({ name: "feature" })
  .use(base) // Inject dependencies
  .command("cmd", (command) => 
    command.setDescription("...").handle(async (ctx, options, itx) => {
      // ctx contains injected dependencies (prisma, redis, etc.)
    })
  )
  .group("admin", (group) => 
    group.setDefaultMemberPermissions("ManageGuild")
         .addCommand("subcmd", ...)
  );
```

**Base Dependencies**: Always `.use(base)` which provides essential services:
- `prisma`: Database client
- `redis`: Redis client  
- `messageQueue`: Background task scheduler
- `moderationLog`: Structured logging
- `lock`: Distributed locking

**Command Structure**: Commands use strongly-typed options:
```typescript
.addUser("user", (option) => option.setDescription("...").setRequired(true))
.addInteger("amount", (option) => option.setMinValue(1))
.handle(async (ctx, { user, amount }, itx) => { ... })
```

**Error Handling**: Use `discordTry()` wrapper for Discord API calls that may fail:
```typescript
await discordTry(
  async () => itx.guild.members.fetch(userId),
  [RESTJSONErrorCodes.UnknownMember],
  () => null // fallback
);
```

## Development Workflow

### Setup Commands
```bash
# Dev Container (recommended) - auto-installs dependencies
bun install
bun prisma-generate && bun prisma-migrate-deploy && bun seed

# Start bot
bun start

# Reload Discord commands during development
bun reload-commands
```

### Database Operations
- **Migrations**: `bun prisma-migrate-dev` (development) or `bun prisma-migrate-deploy` (production)
- **Schema changes**: Edit `packages/db/prisma/schema.prisma`, then migrate
- **Database GUI**: `bun prisma-studio`
- **Reset database**: `bun prisma-migrate-reset` (development only)

### Code Quality
- **Linting/Formatting**: `bun fix` (uses Biome)
- **Type checking**: `bun typecheck`
- **Dead code detection**: Uses Knip configuration
- **Git hooks**: Lefthook runs checks pre-commit

## Project-Specific Conventions

### Database Patterns
**Always ensure users exist** before operations:
```typescript
await ensureUserExists(prisma, user);
// or for multiple users
await ensureUsersExist(prisma, userIds);
```

**Pagination**: Use `DatabasePaginator` for database queries, `StaticPaginator` for arrays:
```typescript
const paginator = new DatabasePaginator(
  (props) => prisma.model.findMany({ ...props }),
  () => prisma.model.count()
);
const view = new PaginatedView(paginator, "Title", formatter, true);
await view.render(itx);
```

**Currency/Economy**: Always use `STRATA_CZASU_CURRENCY.symbol` and `addBalance()` helper
**Locks**: Use `ctx.lock.acquire(key)` for critical sections to prevent race conditions

### Discord Interaction Patterns
**Guild-only commands**: Start handlers with `if (!itx.inCachedGuild()) return;`
**Deferred replies**: Use `await itx.deferReply()` for long-running operations
**Error responses**: Use `errorFollowUp(itx, message)` for consistent error formatting
**Modal handling**: Set unique customIds like `modal-${itx.user.id}` and use `awaitModalSubmit()`

### File Organization
- **Feature modules**: Each feature in `apps/bot/src/` as single file or directory
- **Utilities**: Generic helpers in `apps/bot/src/util/`
- **Constants**: Guild/user IDs in `specializedConstants.ts`
- **Main registration**: Import and `.use()` all features in `apps/bot/src/index.ts`

### Testing
Test files located in `*/test/` directories within each package. Run tests with:
```bash
bun test                # Run all tests
bun test apps/bot       # Bot-specific tests
bun test packages/utils # Utility tests
```

### Deployment Notes
- **Production mode**: `bun start:prod` (runs migrations + seed + start)
- **Environment**: Uses dev containers with PostgreSQL + Redis services
- **Configuration**: Copy `.env.example` to `.env` and configure Discord bot tokens
- **Monitoring**: Optional Sentry integration for error tracking

## Integration Points

**Database**: Prisma ORM with PostgreSQL, shared client is accessible via `ctx.prisma`
**Cache**: Redis for sessions, locks, and temporary data
**External APIs**: OpenAI (AI features), Sentry (monitoring), Shlink (URL shortening)
**Discord**: Custom Hashira framework wrapping discord.js with type safety
**Task Queue**: Postgres-based message queue for delayed operations (mutes, reminders, etc.)

Key insight: The Hashira framework provides a highly structured, type-safe way to build Discord bots with dependency injection, making features modular and testable.
