import { relations } from "drizzle-orm";
import { serial, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { user } from "./user";
import { guild } from "./guild";

export const userActivity = pgTable("user_activity", {
	id: serial("id").primaryKey(),
	userId: text("userId")
		.references(() => user.id)
		.notNull(),
	guildId: text("guildId")
		.references(() => guild.id)
		.notNull(),
	channelId: text("channelId").notNull(),
	timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const userActivityRelations = relations(userActivity, ({ one }) => ({
	user: one(user, {
		fields: [userActivity.userId],
		references: [user.id],
	}),
	guild: one(guild, {
		fields: [userActivity.guildId],
		references: [guild.id],
	}),
}));
