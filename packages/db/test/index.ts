import postgres from "postgres";
import env from "@hashira/env";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const connection = postgres({
	host: env.POSTGRES_TEST_HOST,
	user: env.POSTGRES_USER,
	password: env.POSTGRES_PASSWORD,
	database: env.POSTGRES_DB,
});

export const db = drizzle(connection, { schema });

await migrate(db, { migrationsFolder: "drizzle" });