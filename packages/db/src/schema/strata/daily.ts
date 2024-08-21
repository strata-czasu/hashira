import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { guild, user } from "..";

export const dailyPointsRedeems = pgTable("dailyPointsRedeems", {
  id: serial("id").primaryKey(),
  guildId: text("guildId")
    .notNull()
    .references(() => guild.id),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const dailyPointsRedeemsRelations = relations(dailyPointsRedeems, ({ one }) => ({
  guild: one(guild, {
    fields: [dailyPointsRedeems.guildId],
    references: [guild.id],
  }),
  user: one(user, {
    fields: [dailyPointsRedeems.userId],
    references: [user.id],
  }),
}));
