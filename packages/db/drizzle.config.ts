import env from "@hashira/env";
import type { Config } from "drizzle-kit";

export default {
	schema: "./src/schema/*",
	out: "./drizzle/",
	driver: "pg",
	dbCredentials: {
		database: env.POSTGRES_DB,
		host: env.POSTGRES_HOST,
		password: env.POSTGRES_PASSWORD,
		user: env.POSTGRES_USER,
	},
	strict: true,
	verbose: true,
} satisfies Config;
