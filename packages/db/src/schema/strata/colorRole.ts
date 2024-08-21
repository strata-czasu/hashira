import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { guild, user } from "..";

export const colorRole = pgTable("colorRole", {
  id: serial("id").primaryKey(),
  guildId: text("guildId")
    .notNull()
    .references(() => guild.id),
  ownerId: text("ownerId")
    .notNull()
    .references(() => user.id),
  name: text("name").notNull(),
  roleId: text("roleId").notNull(),
  expiration: timestamp("expiration"),
  slots: integer("slots").notNull(),
});

export const colorRoleRelations = relations(colorRole, ({ one }) => ({
  guild: one(guild, {
    fields: [colorRole.guildId],
    references: [guild.id],
  }),
  owner: one(user, {
    fields: [colorRole.ownerId],
    references: [user.id],
  }),
}));
