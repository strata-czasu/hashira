import { relations } from "drizzle-orm";
import { integer, pgEnum, serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../../pgtable";
import { user } from "../user";
import { wallet } from "./wallet";

export const entryType = pgEnum("entry_type", ["debit", "credit"]);
export const transactionType = pgEnum("transaction_type", ["transfer", "add"]);

export const transaction = pgTable("transaction", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet")
    .references(() => wallet.id)
    .notNull(),
  relatedWalletId: integer("relatedWallet").references(() => wallet.id),
  relatedUserId: text("relatedUserId").references(() => user.id),
  amount: integer("amount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reason: text("reason"),
  transactionType: transactionType("transactionType").notNull(),
  entryType: entryType("entryType").notNull(),
});

export const transactionRelations = relations(transaction, ({ one }) => ({
  relatedWalet: one(wallet, {
    fields: [transaction.relatedWalletId],
    references: [wallet.id],
  }),
  wallet: one(wallet, { fields: [transaction.walletId], references: [wallet.id] }),
}));
