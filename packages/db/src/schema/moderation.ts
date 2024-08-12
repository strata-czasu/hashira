import { isNull, relations } from "drizzle-orm";
import { index, serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { guild } from "./guild";
import { user } from "./user";

export const warn = pgTable(
  "warn",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    editedAt: timestamp("editedAt").$onUpdate(() => new Date()),
    deletedAt: timestamp("deletedAt"),
    guildId: text("guildId")
      .notNull()
      .references(() => guild.id),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    moderatorId: text("moderatorId")
      .notNull()
      .references(() => user.id),
    reason: text("reason").notNull(),
    deleteReason: text("deleteReason"),
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
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    editedAt: timestamp("editedAt").$onUpdate(() => new Date()),
    deletedAt: timestamp("deletedAt"),
    guildId: text("guildId")
      .notNull()
      .references(() => guild.id),
    userId: text("userId")
      .notNull()
      .references(() => user.id),
    moderatorId: text("moderatorId")
      .notNull()
      .references(() => user.id),
    reason: text("reason").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    deleteReason: text("deleteReason"),
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
