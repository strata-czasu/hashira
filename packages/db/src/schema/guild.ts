import { text } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";

export const guild = pgTable("guild", {
	id: text("id").primaryKey(),
});
