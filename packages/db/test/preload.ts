import { afterAll, beforeAll } from "bun:test";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from ".";
import * as schema from "../src/schema";

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Preload complete");
});

afterAll(async () => {
  await db.delete(schema.user);
  await db.delete(schema.guild);
});
