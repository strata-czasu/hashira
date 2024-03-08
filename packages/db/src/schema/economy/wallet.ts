import { relations } from "drizzle-orm";
import { integer, serial, text } from "drizzle-orm/pg-core";
import { pgTable } from "../../pgtable";
import { user } from "../user";
import { currency } from "./currency";

export const wallet = pgTable("wallet", {
	id: serial("id").primaryKey(),
	name: text("name"),
	userId: text("userId").references(() => user.id),
	currencyId: integer("currency").references(() => currency.id),
});

export const walletRelations = relations(wallet, ({ one }) => ({
	user: one(user, {
		fields: [wallet.userId],
		references: [user.id],
	}),
	currency: one(currency, {
		fields: [wallet.currencyId],
		references: [currency.id],
	}),
}));
