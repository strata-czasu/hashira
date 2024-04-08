import { Hashira } from "@hashira/core";
import { guild } from "@hashira/db";
import { type PgInsertValue } from "drizzle-orm/pg-core";
import { base } from "./base";

export const guildAvailability = new Hashira({ name: "guild-availability" })
	.use(base)
	.handle("ready", async ({ db }, client) => {
		const guilds = client.guilds.cache.map(
			(discordGuild) =>
				({ id: BigInt(discordGuild.id) }) as PgInsertValue<typeof guild>,
		);

		await db.insert(guild).values(guilds).onConflictDoNothing().returning();
	})
	.handle("guildCreate", async ({ db }, discordGuild) => {
		await db
			.insert(guild)
			.values({ id: BigInt(discordGuild.id) })
			.onConflictDoNothing()
			.execute();
	});
