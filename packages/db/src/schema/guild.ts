import { relations } from "drizzle-orm";
import { text } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { autoRole } from "./autorole";

export const guild = pgTable("guild", {
	id: text("id").primaryKey(),
});

export const guildRelations = relations(guild, ({ many }) => ({
	autoRoles: many(autoRole),
}));
