import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { base } from "./base";
import { emojiCounting } from "./emojiCounting";
import { guildAvailability } from "./guildAvailability";
import { miscellaneous } from "./miscellaneous";
import { userActivity } from "./userActivity";
import { autoRole } from "./autoRole";

export const bot = new Hashira({ name: "bot" })
	.use(base)
	.use(guildAvailability)
	.use(emojiCounting)
	.use(miscellaneous)
	.use(userActivity)
	.use(autoRole);

if (import.meta.main) {
	// TODO: For docker, we need to handle SIGTERM, but because we use 'bun run' we don't
	// get any signals, so we need to figure out how to handle this!
	await bot.start(env.BOT_TOKEN);
}
