import { type ExtractContext, Hashira } from "@hashira/core";
import { type ExtendedPrismaClient, Prisma } from "@hashira/db";
import type { Guild } from "discord.js";
import { partition } from "es-toolkit";
import { base } from "./base";
import type { LogMessageType, Logger } from "./logging/base/logger";
import { GUILD_IDS, STRATA_CZASU } from "./specializedConstants";

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

async function registerGuildLogger<T extends LogMessageType>(
  log: Logger<T>,
  guild: Guild,
  channelId: string,
) {
  const channel = await guild.channels.fetch(channelId);
  if (!channel)
    throw new Error(`Log channel ${channelId} not found for guild ${guild.id}`);
  if (!channel.isTextBased())
    throw new Error(`Log channel ${channelId} for guild ${guild.id} is not text based`);

  log.updateGuild(guild, channel);
}

async function registerGuildLoggers(ctx: BaseContext, guild: Guild) {
  const settings = await ctx.prisma.guildSettings.findFirst({
    where: { guildId: guild.id },
    select: { logSettings: true },
  });

  if (!settings?.logSettings) return;

  // TODO)) Generalize logger registration
  if (settings.logSettings.messageLogChannelId)
    await registerGuildLogger(
      ctx.messageLog,
      guild,
      settings.logSettings.messageLogChannelId,
    );
  if (settings.logSettings.memberLogChannelId)
    await registerGuildLogger(
      ctx.memberLog,
      guild,
      settings.logSettings.memberLogChannelId,
    );
  if (settings.logSettings.roleLogChannelId)
    await registerGuildLogger(
      ctx.roleLog,
      guild,
      settings.logSettings.roleLogChannelId,
    );
  if (settings.logSettings.moderationLogChannelId)
    await registerGuildLogger(
      ctx.moderationLog,
      guild,
      settings.logSettings.moderationLogChannelId,
    );
  if (settings.logSettings.profileLogChannelId)
    await registerGuildLogger(
      ctx.profileLog,
      guild,
      settings.logSettings.profileLogChannelId,
    );
  if (settings.logSettings.economyLogChannelId)
    await registerGuildLogger(
      ctx.economyLog,
      guild,
      settings.logSettings.economyLogChannelId,
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
    // Fetch all guild members to ensure we have fully saturated caches
    const membersFetchPromises = allowedGuilds.map((guild) => guild.members.fetch());

    const leavePromises = unallowedGuilds.map((guild) => {
      console.log(`Leaving guild: ${guild.name}, owner: ${guild.ownerId}`);
      return guild.leave();
    });

    await Promise.all([...creationPromises, ...membersFetchPromises, ...leavePromises]);

    // TODO: Decouple logger registration from guild creation, we should not rely on try/catch
    try {
      await registerGuildLogger(
        ctx.strataCzasuLog,
        await client.guilds.fetch(STRATA_CZASU.GUILD_ID),
        STRATA_CZASU.MOD_LOG_CHANNEL_ID,
      );
      ctx.strataCzasuLog.start(client);
    } catch (e) {
      console.error("Failed to register Strata Czasu logger", e);
    }

    ctx.messageLog.start(client);
    ctx.memberLog.start(client);
    ctx.roleLog.start(client);
    ctx.moderationLog.start(client);
    ctx.profileLog.start(client);
    ctx.economyLog.start(client);

    ctx.userTextActivityQueue.start(ctx.prisma, ctx.redis);
    ctx.stickyMessageCache.start(ctx.prisma);
  })
  .handle("guildCreate", async (ctx, guild) => {
    if (!ALLOWED_GUILDS.includes(guild.id)) {
      console.log(`Leaving guild: ${guild.name}, owner: ${guild.ownerId}`);
      guild.leave();
      return;
    }

    await processAllowedGuild(ctx, guild);
  });
