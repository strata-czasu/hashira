import { relations } from "drizzle-orm";
import { pgEnum, text } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { wallet } from "./economy/wallet";
import { mute, warn } from "./moderation";
import { userTextActivity } from "./userTextActivity";

export const verificationLevel = pgEnum("verification_level", ["13_plus", "18_plus"]);

export const user = pgTable("users", {
  id: text("id").primaryKey(),
  verificationLevel: verificationLevel("verification_level"),
});

export const userRelations = relations(user, ({ many }) => ({
  textActivities: many(userTextActivity),
  wallets: many(wallet),
  receivedWarns: many(warn, { relationName: "warnedUser" }),
  givenWarns: many(warn, { relationName: "moderator" }),
  receivedMutes: many(mute, { relationName: "mutedUser" }),
  givenMutes: many(mute, { relationName: "moderator" }),
}));
