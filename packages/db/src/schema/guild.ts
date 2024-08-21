import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { autoRole } from "./autorole";
import { guildSettings } from "./guildSettings";

export const guild = pgTable("guild", {
  id: text("id").primaryKey(),
});

export const guildRelations = relations(guild, ({ one, many }) => ({
  autoRoles: many(autoRole),
  settings: one(guildSettings, {
    fields: [guild.id],
    references: [guildSettings.guildId],
  }),
}));
