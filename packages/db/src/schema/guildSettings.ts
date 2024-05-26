import { relations } from "drizzle-orm";
import { serial, text } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { guild } from "./guild";

export const guildSettings = pgTable("guild_settings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id")
    .notNull()
    .unique()
    .references(() => guild.id),
  muteRoleId: text("mute_role_id"),
  plus18RoleId: text("plus18_role_id"),
});

export const guildSettingsRelations = relations(guildSettings, ({ one }) => ({
  guild: one(guild, {
    fields: [guildSettings.guildId],
    references: [guild.id],
  }),
}));
