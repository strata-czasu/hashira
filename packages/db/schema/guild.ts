import { bigint } from "drizzle-orm/pg-core";
import { pgTable } from "../pgtable";

export const guild = pgTable("guild", {
	id: bigint("id", { mode: "bigint" }).primaryKey(),
});
