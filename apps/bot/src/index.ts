import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import * as Sentry from "@sentry/bun";
import { autoRole } from "./autoRole";
import { base } from "./base";
import { emojiCounting } from "./emojiCounting";
import { guildAvailability } from "./guildAvailability";
import { miscellaneous } from "./miscellaneous";
import { moderation } from "./moderation";
import { roles } from "./roles";
import { settings } from "./settings";
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
  .use(guildAvailability)
  .use(settings)
  .use(emojiCounting)
  .use(miscellaneous)
  .use(roles)
  .use(userActivity)
  .use(autoRole)
  .use(moderation)
  .use(tasks);

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
