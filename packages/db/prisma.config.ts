import { join } from "node:path";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: join("prisma"),
  migrations: {
    path: join("prisma", "migrations"),
  },
  datasource: databaseUrl ? { url: databaseUrl } : {},
});
