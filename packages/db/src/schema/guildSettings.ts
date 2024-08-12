import { relations } from "drizzle-orm";
import { serial, text } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
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
