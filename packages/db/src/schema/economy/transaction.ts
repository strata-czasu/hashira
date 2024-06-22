import { relations } from "drizzle-orm";
import { integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../../pgtable";
import { user } from "../user";
import { wallet } from "./wallet";

export const transaction = pgTable("transaction", {
  id: serial("id").primaryKey(),
  currencyId: integer("transactionCurrencyId").notNull(),
  fromWalletId: integer("fromWallet").references(() => wallet.id),
  toWalletId: integer("toWallet")
    .references(() => wallet.id)
    .notNull(),
  fromUserId: text("fromUserId").references(() => user.id),
  toUserId: text("toUserId")
    .references(() => user.id)
    .notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const transactionRelations = relations(transaction, ({ one }) => ({
  currency: one(wallet, { fields: [transaction.currencyId], references: [wallet.id] }),
  fromWallet: one(wallet, {
    fields: [transaction.fromWalletId],
    references: [wallet.id],
  }),
  toWallet: one(wallet, { fields: [transaction.toWalletId], references: [wallet.id] }),
  fromUser: one(user, { fields: [transaction.fromUserId], references: [user.id] }),
  toUser: one(user, { fields: [transaction.toUserId], references: [user.id] }),
}));
