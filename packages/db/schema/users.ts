import { bigint, pgTable } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: bigint("id", { mode: "bigint" }).primaryKey(),
});
