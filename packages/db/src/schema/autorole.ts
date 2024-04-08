import { relations } from "drizzle-orm";
import { serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { guild } from "./guild";

export const autoRole = pgTable(
	"auto_role",
	{
		id: serial("id").primaryKey(),
		guildId: text("guild_id")
			.notNull()
			.references(() => guild.id),
		roleId: text("role_id").notNull(),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
	},
	(t) => ({
		uniqueGuildAndRole: unique().on(t.guildId, t.roleId),
	}),
);

export const autoRoleRelations = relations(autoRole, ({ one }) => ({
	guild: one(guild, {
		fields: [autoRole.guildId],
		references: [guild.id],
	}),
}));
