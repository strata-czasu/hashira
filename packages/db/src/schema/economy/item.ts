import { integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../../pgtable";
import { user } from "../user";

export const item = pgTable("item", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  editedAt: timestamp("editedAt").$onUpdate(() => new Date()),
  deletedAt: timestamp("deletedAt"),
  createdBy: text("createdBy")
    .notNull()
    .references(() => user.id),
});

export const inventoryItem = pgTable("inventory_item", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId")
    .notNull()
    .references(() => item.id),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
