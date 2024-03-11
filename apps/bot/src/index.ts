import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { base } from "./base";
import { emojiCounting } from "./emojiCounting";
import { guildAvailability } from "./guildAvailability";

export const bot = new Hashira({ name: "bot" })
	.use(base)
	.use(guildAvailability)
	.use(emojiCounting);

if (import.meta.main) {
	await bot.start(env.BOT_TOKEN);
}
