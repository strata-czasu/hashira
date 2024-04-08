import { relations } from "drizzle-orm";
import { integer, serial, text, unique } from "drizzle-orm/pg-core";
import { pgTable } from "../../pgtable";
import { user } from "../user";
import { currency } from "./currency";

export const wallet = pgTable(
  "wallet",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("userId").references(() => user.id),
    currencyId: integer("currency").references(() => currency.id),
  },
  (t) => ({
    uniqueUserToName: unique().on(t.userId, t.name),
  }),
);

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
