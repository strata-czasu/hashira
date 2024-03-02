import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { base } from "./base";

await new Hashira({ name: "bot" })
	.use(base)
	.start(env.BOT_TOKEN);
