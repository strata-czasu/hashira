import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { guildAvailability } from "./guildAvailability";
import { base } from "./base";

await new Hashira({ name: "bot" })
	.use(base)
	.use(guildAvailability)
	.start(env.BOT_TOKEN);
