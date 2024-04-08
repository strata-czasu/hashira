import { relations } from "drizzle-orm";
import { serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { guild, user } from "./";

export const emojiUsage = pgTable("emoji_usage", {
  id: serial("id").primaryKey(),
  guildId: text("guildId")
    .notNull()
    .references(() => guild.id),
  emojiId: text("emojiId").notNull(),
  // we don't really want to reference users, we just want to store the id
  userId: text("userId").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const emojiUsageRelations = relations(emojiUsage, ({ one }) => ({
  guild: one(guild, {
    fields: [emojiUsage.guildId],
    references: [guild.id],
  }),
  user: one(user, {
    fields: [emojiUsage.userId],
    references: [user.id],
  }),
}));
