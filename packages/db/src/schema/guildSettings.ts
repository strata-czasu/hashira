import { relations } from "drizzle-orm";
import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { guild } from "./guild";

export const guildSettings = pgTable("guildSettings", {
  id: serial("id").primaryKey(),
  guildId: text("guildId")
    .notNull()
    .unique()
    .references(() => guild.id),
  muteRoleId: text("muteRoleId"),
  plus18RoleId: text("plus18RoleId"),
});

export const guildSettingsRelations = relations(guildSettings, ({ one }) => ({
  guild: one(guild, {
    fields: [guildSettings.guildId],
    references: [guild.id],
  }),
}));
