import { relations } from "drizzle-orm";
import { text } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { wallet } from "./economy/wallet";
import { userTextActivity } from "./userTextActivity";

export const user = pgTable("users", {
	id: text("id").primaryKey(),
});

export const userRelations = relations(user, ({ many }) => ({
	textActivities: many(userTextActivity),
	wallets: many(wallet),
}));
