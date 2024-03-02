import { Hashira } from "@hashira/core";
import env from "@hashira/env";

type CustomEventHandler = (event: string, ...args: unknown[]) => void;

const bot = new Hashira()
	.state("customEvents", new Map<string, CustomEventHandler>())
	.tapState("customEvents", (customEvents) => {
		customEvents.set("test", (event, ...args) => {
			console.log(event, args);
		});
	})
	.handle("messageCreate", async (ctx) => {
		ctx.state.customEvents.get("test")?.("messageCreate", ctx);
	})
	.derive((ctx) => ({
		customEvents: ctx.state.customEvents,
	}));

await bot.start(env.BOT_TOKEN);
