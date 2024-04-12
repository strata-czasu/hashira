import { sql } from "drizzle-orm";
import { jsonb, pgEnum, serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";

export const statusEnum = pgEnum("status", ["pending", "completed", "failed"]);

export const messageQueue = pgTable("messageQueue", {
  id: serial("id").primaryKey(),
  status: statusEnum("status").default("pending"),
  created: timestamp("created").defaultNow(),
  handleAfter: timestamp("handleAfter").defaultNow(),
  data: jsonb("data").notNull(),
  identifier: text("identifier").default(sql`gen_random_uuid()::text`),
});
