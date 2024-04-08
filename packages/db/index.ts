import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import env from "@hashira/env";

export const connection = postgres({
    host: env.POSTGRES_HOST,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
});

export const db = drizzle(connection);
