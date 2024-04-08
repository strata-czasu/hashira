import { relations } from "drizzle-orm";
import { bigint, serial } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { wallet } from "./economy/wallet";

export const user = pgTable("users", {
	id: bigint("id", { mode: "bigint" }).primaryKey(),
});

export const userRelations = relations(user, ({ many }) => ({
	activites: many(userActivity),
	wallets: many(wallet),
}));

export const userActivity = pgTable("user_activity", {
	id: serial("id").primaryKey(),
	userId: bigint("userId", { mode: "bigint" }).references(() => user.id),
});

export const userActivityRelations = relations(userActivity, ({ one }) => ({
	user: one(user, {
		fields: [userActivity.userId],
		references: [user.id],
	}),
}));
