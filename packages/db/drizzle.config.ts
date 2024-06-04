import env from "@hashira/env";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/*",
  out: "./drizzle/",
  dialect: "postgresql",
  dbCredentials: {
    database: env.POSTGRES_DB,
    host: env.POSTGRES_HOST,
    password: env.POSTGRES_PASSWORD,
    user: env.POSTGRES_USER,
    ssl: env.USE_SSL ?? false,
  },
  strict: true,
  verbose: true,
} satisfies Config;
