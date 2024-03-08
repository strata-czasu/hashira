import env from "@hashira/env";
import { bot } from "./src";

await bot.registerCommands(
	env.BOT_TOKEN,
	env.BOT_DEVELOPER_GUILD_ID,
	env.BOT_CLIENT_ID,
);
