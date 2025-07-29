import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import * as Sentry from "@sentry/bun";
import { ai } from "./ai";
import { autoRole } from "./autoRole";
import { avatar } from "./avatar";
import { base } from "./base";
import { brochure } from "./brochure";
import { dmForwarding } from "./dmForwarding";
import { dmVoting } from "./dmVoting";
import { economy } from "./economy";
import { emojiCounting } from "./emojiCounting/emojiCounting";
import { fish } from "./fish";
import { giveaway } from "./giveaway/giveaway";
import { guildAvailability } from "./guildAvailability";
import { inviteManagement } from "./inviteManagement";
import { level100Tracker } from "./level100Tracker";
import { discordEventLogging } from "./logging/discordEventLogging";
import { massDM } from "./massDM";
import { miscellaneous } from "./miscellaneous";
import { moderation } from "./moderation";
import { ping } from "./ping";
import { profile } from "./profile";
import { ranking } from "./ranking";
import { roles } from "./roles";
import { settings } from "./settings";
import { stickyMessage } from "./stickyMessage/stickyMessage";
import { strataCzasu } from "./strata";
import { ticketReminder } from "./strata/ticketReminder";
import { tasks } from "./tasks";
import { userActivity } from "./userActivity";
import { userComplaint } from "./userComplaint";
import { userTransfer } from "./userTransfer";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    integrations: [
      Sentry.prismaIntegration({
        // Override the default instrumentation that Sentry uses
        prismaInstrumentation: new PrismaInstrumentation(),
      }),
    ],
  });
}

export const bot = new Hashira({ name: "bot" })
  .use(base)
  .use(discordEventLogging)
  .use(autoRole)
  .use(avatar)
  .use(strataCzasu)
  .use(level100Tracker)
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
  .use(stickyMessage)
  .use(brochure)
  .use(userActivity)
  .use(userComplaint)
  .use(userTransfer)
  .use(inviteManagement)
  .use(dmVoting)
  .use(ping)
  .use(ticketReminder)
  .use(massDM)
  .use(fish)
  .use(giveaway)
  .use(ranking)
  .handle("ready", async () => {
    console.log("Bot is ready!");
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
