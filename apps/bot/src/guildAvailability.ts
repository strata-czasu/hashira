import { type ExtractContext, Hashira } from "@hashira/core";
import { type ExtendedPrismaClient, Prisma } from "@hashira/db";
import type { Guild } from "discord.js";
import { partition } from "es-toolkit";
import { base } from "./base";
import type { Logger } from "./logging/logger";
import { GUILD_IDS } from "./specializedConstants";

type BaseContext = ExtractContext<typeof base>;
const ALLOWED_GUILDS: string[] = Object.values(GUILD_IDS);

async function createGuildSettings(prisma: ExtendedPrismaClient, guildId: string) {
  try {
    await prisma.guild.create({
      data: { id: guildId, guildSettings: { create: {} } },
    });
  } catch (e) {
    // P2002: Unique constraint
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return;
    throw e;
  }
}

// FIXME)) Use correct type for `log` with any type inside
async function registerGuildLogger(log: Logger, guild: Guild, channelId: string) {
  const channel = await guild.channels.fetch(channelId);
  if (!channel)
    throw new Error(`Log channel ${channelId} not found for guild ${guild.id}`);
  if (!channel.isTextBased())
    throw new Error(`Log channel ${channelId} for guild ${guild.id} is not text based`);

  log.addGuild(guild, channel);
}

async function registerGuildLoggers(ctx: BaseContext, guild: Guild) {
  const { prisma, messageLog, memberLog, banLog, profileLog } = ctx;

  const settings = await prisma.guildSettings.findFirst({
    where: { guildId: guild.id },
    select: { logSettings: true },
  });

  if (!settings?.logSettings) return;

  // TODO)) Generalize logger registration
  if (settings.logSettings.messageLogChannelId)
    await registerGuildLogger(
      messageLog as Logger,
      guild,
      settings.logSettings.messageLogChannelId,
    );
  if (settings.logSettings.memberLogChannelId)
    await registerGuildLogger(
      memberLog as Logger,
      guild,
      settings.logSettings.memberLogChannelId,
    );
  if (settings.logSettings.banLogChannelId)
    await registerGuildLogger(
      banLog as Logger,
      guild,
      settings.logSettings.banLogChannelId,
    );
  if (settings.logSettings.profileLogChannelId)
    await registerGuildLogger(
      profileLog as Logger,
      guild,
      settings.logSettings.profileLogChannelId,
    );
}

async function processAllowedGuild(ctx: BaseContext, guild: Guild) {
  await createGuildSettings(ctx.prisma, guild.id);
  await registerGuildLoggers(ctx, guild);
}

export const guildAvailability = new Hashira({ name: "guild-availability" })
  .use(base)
  .handle("ready", async (ctx, client) => {
    const [allowedGuilds, unallowedGuilds] = partition(
      [...client.guilds.cache.values()],
      (guild) => ALLOWED_GUILDS.includes(guild.id),
    );
    const creationPromises = allowedGuilds.map((guild) =>
      processAllowedGuild(ctx, guild),
    );

    const leavePromises = unallowedGuilds.map((guild) => {
      console.log(`Leaving guild: ${guild.name}, owner: ${guild.ownerId}`);
      return guild.leave();
    });

    await Promise.all([...creationPromises, ...leavePromises]);

    ctx.messageLog.startConsumeLoops(client);
    ctx.memberLog.startConsumeLoops(client);
    ctx.banLog.startConsumeLoops(client);
    ctx.profileLog.startConsumeLoops(client);
  })
  .handle("guildCreate", async (ctx, guild) => {
    if (!ALLOWED_GUILDS.includes(guild.id)) {
      console.log(`Leaving guild: ${guild.name}, owner: ${guild.ownerId}`);
      guild.leave();
      return;
    }

    await processAllowedGuild(ctx, guild);
  });
