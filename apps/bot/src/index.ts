import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { base } from "./base";
import { emojiCounting } from "./emojiCounting";
import { guildAvailability } from "./guildAvailability";
import { userActivity } from "./userActivity";

export const bot = new Hashira({ name: "bot" })
	.use(base)
	.use(guildAvailability)
	.use(emojiCounting)
	.use(userActivity);

if (import.meta.main) {
	// TODO: For docker, we need to handle SIGTERM
	// This is dirty, but it works for now. We should gracefuly stop the bot
	// along with its database.
	process.on("SIGTERM", () => process.exit(1));
	await bot.start(env.BOT_TOKEN);
}
