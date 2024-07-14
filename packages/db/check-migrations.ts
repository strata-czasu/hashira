import { $ } from "bun";

// Check if there are any schema changes that would require creating migrations.
// Also ensure that the schema metadata is up to date and they are consistent.

await $`bun run drizzle-kit check`;
await $`bun run generate`;

// Add all changes and check if there are any
// We need to add everything to also include newly generated migrations
await $`git add .`;
const { exitCode } = await $`git diff-index --quiet --cached HEAD`.nothrow();
if (exitCode !== 0) {
  console.error(
    "Migrations are out of date with the database schema. Please run `bun generate`.",
  );
  process.exit(1);
}
