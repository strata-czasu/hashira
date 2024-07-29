import env from "@hashira/env";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/*",
  out: "./drizzle/",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
} satisfies Config;
