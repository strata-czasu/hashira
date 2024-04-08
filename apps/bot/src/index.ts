import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { guildAvailability } from "./guildAvailability";
import { base } from "./base";

export const bot = new Hashira({ name: "bot" })
	.use(base)
	.use(guildAvailability)

if (import.meta.main) {
	await bot.start(env.BOT_TOKEN);
}
