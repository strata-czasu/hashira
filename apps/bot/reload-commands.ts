import { prisma, redis } from "@hashira/db";
import env from "@hashira/env";
import { bot } from "./src";

await bot.registerCommands(
  env.BOT_TOKEN,
  env.BOT_DEVELOPER_GUILD_IDS,
  env.BOT_CLIENT_ID,
);

await prisma.$disconnect();
await redis.disconnect();
