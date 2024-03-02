import { relations } from "drizzle-orm";
import { bigint } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { wallet } from "./economy/wallet";
import { userActivity } from "./userActivity";

export const user = pgTable("users", {
	id: bigint("id", { mode: "bigint" }).primaryKey(),
});

export const userRelations = relations(user, ({ many }) => ({
	activites: many(userActivity),
	wallets: many(wallet),
}));
