import { relations } from "drizzle-orm";
import { serial, text } from "drizzle-orm/pg-core";
import { pgTable } from "../../pgtable";
import { wallet } from "./wallet";

export const currency = pgTable("currencies", {
	id: serial("id").primaryKey(),
	name: text("name"),
	symbol: text("symbol"),
});

export const currencyRelations = relations(currency, ({ many }) => ({
	wallets: many(wallet),
}));
