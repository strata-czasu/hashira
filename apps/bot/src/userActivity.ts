import { Hashira } from "@hashira/core";
import { schema } from "@hashira/db";
import { base } from "./base";

// TODO: this could be merged with the emojiCounting plugin
export const userActivity = new Hashira({ name: "user-activity" })
	.use(base)
	.handle("guildMessageCreate", async ({ db }, message) => {
		await db
			.insert(schema.guild)
			.values({ id: message.guild.id })
			.onConflictDoNothing();

		await db
			.insert(schema.user)
			.values({ id: message.author.id })
			.onConflictDoNothing();

		await db.insert(schema.userActivity).values({
			userId: message.author.id,
			guildId: message.guild.id,
			channelId: message.channel.id,
			timestamp: message.createdAt,
		});
	});
