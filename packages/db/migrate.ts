import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import env from "@hashira/env";

export const connection = postgres({
    host: env.POSTGRES_HOST,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
});
const db = drizzle(connection);

await migrate(db, { migrationsFolder: "drizzle" });

await connection.end();