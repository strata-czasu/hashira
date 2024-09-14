import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import * as Sentry from "@sentry/bun";
import { ai } from "./ai";
import { autoRole } from "./autoRole";
import { avatar } from "./avatar";
import { base } from "./base";
import { dmForwarding } from "./dmForwarding";
import { economy } from "./economy";
import { emojiCounting } from "./emojiCounting";
import { guildAvailability } from "./guildAvailability";
import { discordEventLogging } from "./logging/discordEventLogging";
import { miscellaneous } from "./miscellaneous";
import { moderation } from "./moderation";
import { profile } from "./profile";
import { roles } from "./roles";
import { settings } from "./settings";
import { colorRoles } from "./strata/colorRoles";
import { tasks } from "./tasks";
import { userActivity } from "./userActivity";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0, // Capture 100% of the transactions
  });
}

export const bot = new Hashira({ name: "bot" })
  .use(base)
  .use(discordEventLogging)
  .use(autoRole)
  .use(avatar)
  .use(colorRoles)
  .use(dmForwarding)
  .use(economy)
  .use(emojiCounting)
  .use(guildAvailability)
  .use(miscellaneous)
  .use(moderation)
  .use(profile)
  .use(roles)
  .use(settings)
  .use(tasks)
  .use(ai)
  .use(userActivity)
  .handle("ready", async () => {
    // TODO)) Use a proper logger
    console.log("Bot is ready");
  });

if (import.meta.main) {
  // TODO: For docker, we need to handle SIGTERM, but because we use 'bun run' we don't
  // get any signals, so we need to figure out how to handle this!
  try {
    await bot.start(env.BOT_TOKEN);
  } catch (e) {
    if (env.SENTRY_DSN) Sentry.captureException(e);
    console.error(e);
    throw e;
  }
}
