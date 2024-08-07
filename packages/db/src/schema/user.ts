import { relations, sql } from "drizzle-orm";
import { type AnyPgColumn, pgEnum, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { currency } from "./economy";
import { wallet } from "./economy/wallet";
import { mute, warn } from "./moderation";
import { userTextActivity } from "./userTextActivity";

export const verificationLevel = pgEnum("verification_level", [
  "13_plus",
  "16_plus",
  "18_plus",
]);

export const user = pgTable("users", {
  id: text("id").primaryKey(),
  verificationLevel: verificationLevel("verification_level"),
  marriedTo: text("married_to")
    .references((): AnyPgColumn => user.id)
    .default(sql`null`),
  marriedAt: timestamp("married_at"),
});

export const userRelations = relations(user, ({ many }) => ({
  textActivities: many(userTextActivity),
  wallets: many(wallet),
  currencies: many(currency),
  receivedWarns: many(warn, { relationName: "warnedUser" }),
  givenWarns: many(warn, { relationName: "moderator" }),
  receivedMutes: many(mute, { relationName: "mutedUser" }),
  givenMutes: many(mute, { relationName: "moderator" }),
}));
