import { guild, user } from "@hashira/db/schema";
import { relations } from "drizzle-orm";
import { bigint, date, serial } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";

export const emojiUsage = pgTable("emoji_usage", {
	id: serial("id").primaryKey(),
	guildId: bigint("guildId", { mode: "bigint" })
		.references(() => guild.id)
		.notNull(),
	emojiId: bigint("emojiId", { mode: "bigint" }).notNull(),
	// we don't really want to reference users, we just want to store the id
	userId: bigint("usedBy", { mode: "bigint" }).notNull(),
	timestamp: date("timestamp").defaultNow().notNull(),
});

export const emojiUsageRelations = relations(emojiUsage, ({ one }) => ({
	guild: one(guild, {
		fields: [emojiUsage.guildId],
		references: [guild.id],
	}),
	user: one(user, {
		fields: [emojiUsage.userId],
		references: [user.id],
	}),
}));
