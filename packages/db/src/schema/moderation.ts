import { relations, sql } from "drizzle-orm";
import { serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { guild } from "./guild";
import { user } from "./user";

export const warn = pgTable("warn", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at").$onUpdate(() => sql`current_timestamp`),
  guildId: text("guild_id")
    .notNull()
    .references(() => guild.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  moderatorId: text("moderator_id")
    .notNull()
    .references(() => user.id),
  reason: text("reason").notNull(),
});

export const warnRelations = relations(warn, ({ one }) => ({
  guild: one(guild, {
    fields: [warn.guildId],
    references: [guild.id],
  }),
  user: one(user, {
    fields: [warn.userId],
    references: [user.id],
    relationName: "warnedUser",
  }),
  moderator: one(user, {
    fields: [warn.moderatorId],
    references: [user.id],
    relationName: "moderator",
  }),
}));
