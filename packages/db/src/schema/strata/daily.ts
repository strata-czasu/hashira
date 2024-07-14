import { relations } from "drizzle-orm";
import { integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { guild, user } from "..";
import { strataPgTable } from "../../pgtable";

export const dailyPointsRedeems = strataPgTable("daily_points_redeems", {
  id: serial("id").primaryKey(),
  guildId: text("guildId")
    .notNull()
    .references(() => guild.id),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  points: integer("points").notNull(),
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
