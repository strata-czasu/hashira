import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { guild } from "./guild";
import { user } from "./user";

export const userTextActivity = pgTable("userTextActivity", {
  id: serial("id").primaryKey(),
  userId: text("userId")
    .references(() => user.id)
    .notNull(),
  guildId: text("guildId")
    .references(() => guild.id)
    .notNull(),
  messageId: text("messageId").notNull(),
  channelId: text("channelId").notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

export const userTextActivityRelations = relations(userTextActivity, ({ one }) => ({
  user: one(user, {
    fields: [userTextActivity.userId],
    references: [user.id],
  }),
  guild: one(guild, {
    fields: [userTextActivity.guildId],
    references: [guild.id],
  }),
}));
