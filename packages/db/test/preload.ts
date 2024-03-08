import { beforeAll, afterAll } from "bun:test"
import { db } from "."
import * as schema from "../src/schema"
import { migrate } from "drizzle-orm/postgres-js/migrator";

beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Preload complete");
})

afterAll(async () => {
    await db.delete(schema.user);
    await db.delete(schema.guild)
})
