import { relations } from "drizzle-orm";
import { integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { guild, user } from "..";
import { strataPgTable } from "../../pgtable";

export const colorRole = strataPgTable("color_role", {
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
