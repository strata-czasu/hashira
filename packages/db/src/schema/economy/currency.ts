import { relations } from "drizzle-orm";
import { serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { pgTable } from "../../pgtable";
import { guild } from "../guild";
import { user } from "../user";
import { wallet } from "./wallet";

export const currency = pgTable(
  "currency",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    guildId: text("guildId")
      .notNull()
      .references(() => guild.id),
    createdBy: text("createdBy")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    uniqueCurrencyName: unique().on(t.guildId, t.name),
    uniqueCurrencySymbol: unique().on(t.guildId, t.symbol),
  }),
);

export const currencyRelations = relations(currency, ({ many, one }) => ({
  wallets: many(wallet),
  guild: one(guild, {
    fields: [currency.guildId],
    references: [guild.id],
  }),
  creator: one(user, {
    fields: [currency.createdBy],
    references: [user.id],
  }),
}));
