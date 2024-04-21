import { isNull, relations } from "drizzle-orm";
import { index, serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { guild } from "./guild";
import { user } from "./user";

export const warn = pgTable(
  "warn",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    editedAt: timestamp("edited_at").$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at"),
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
    deleteReason: text("delete_reason"),
  },
  (table) => ({
    userIdx: index().on(table.userId),
  }),
);

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

export const mute = pgTable(
  "mute",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    editedAt: timestamp("edited_at").$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at"),
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
    endsAt: timestamp("ends_at").notNull(),
    deleteReason: text("delete_reason"),
  },
  (table) => ({
    userIdx: index().on(table.userId),
    currentNotDeletedIdx: index()
      .on(table.endsAt, table.guildId)
      .where(isNull(table.deletedAt)),
  }),
);

export const muteRelations = relations(mute, ({ one }) => ({
  guild: one(guild, {
    fields: [mute.guildId],
    references: [guild.id],
  }),
  user: one(user, {
    fields: [mute.userId],
    references: [user.id],
    relationName: "mutedUser",
  }),
  moderator: one(user, {
    fields: [mute.moderatorId],
    references: [user.id],
    relationName: "moderator",
  }),
}));
