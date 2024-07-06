import { sql } from "drizzle-orm";
import { jsonb, pgEnum, serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";

export const statusEnum = pgEnum("status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
]);

export type TaskDataValue =
  | string
  | number
  | boolean
  | { [x: string]: TaskDataValue }
  | TaskDataValue[];
export type TaskData = { type: string; data: TaskDataValue };

export const task = pgTable("task", {
  id: serial("id").primaryKey(),
  status: statusEnum("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  handleAfter: timestamp("handleAfter").notNull().defaultNow(),
  data: jsonb("data").$type<TaskData>().notNull(),
  identifier: text("identifier").notNull().default(sql`gen_random_uuid()::text`),
});
