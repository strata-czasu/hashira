import { relations } from "drizzle-orm";
import { boolean, integer, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { pgTable } from "../../pgtable";
import { guild } from "../guild";
import { user } from "../user";
import { currency } from "./currency";

export const wallet = pgTable(
  "wallet",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    default: boolean("default").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    guildId: text("guildId")
      .notNull()
      .references(() => guild.id),
    currencyId: integer("currency")
      .notNull()
      .references(() => currency.id, {
        onDelete: "cascade",
      }),
    balance: integer("balance").notNull().default(0),
  },
  (t) => ({
    uniqueUserToName: unique().on(t.userId, t.name, t.guildId),
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
  guild: one(guild, {
    fields: [wallet.guildId],
    references: [guild.id],
  }),
}));
