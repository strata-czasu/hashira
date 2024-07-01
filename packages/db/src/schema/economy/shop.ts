import { integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../../pgtable";
import { user } from "../user";

export const shopItem = pgTable("shop_item", {
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
