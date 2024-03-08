import { relations } from "drizzle-orm";
import { serial, text } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";
import { user } from "./user";

export const userActivity = pgTable("user_activity", {
	id: serial("id").primaryKey(),
	userId: text("userId").references(() => user.id),
});

export const userActivityRelations = relations(userActivity, ({ one }) => ({
	user: one(user, {
		fields: [userActivity.userId],
		references: [user.id],
	}),
}));
