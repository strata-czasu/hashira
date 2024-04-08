import env from "@hashira/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const connection = postgres({
	host: env.POSTGRES_HOST,
	user: env.POSTGRES_USER,
	password: env.POSTGRES_PASSWORD,
	database: env.POSTGRES_DB,
});
const db = drizzle(connection);

await migrate(db, { migrationsFolder: "drizzle" });

// FIXME: This is a workaround to prevent the script from hanging
await connection.end({ timeout: 1 });
