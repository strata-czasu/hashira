import { type ExtractContext, Hashira } from "@hashira/core";
import { type ExtendedPrismaClient, Prisma } from "@hashira/db";
import { DiscordAPIError, type Guild } from "discord.js";
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

  try {
    await guild.members.fetch();
  } catch (e) {
    if (!(e instanceof DiscordAPIError)) throw e;
    console.error(
      `Failed to prefetch members for guild ${guild.id}: ${e.code} - ${e.message}`,
    );
  }
}

async function leaveGuild(guild: Guild) {
  console.log(`Leaving guild: ${guild.name}, owner: ${guild.ownerId}`);
  guild.leave();
}

export const guildAvailability = new Hashira({ name: "guild-availability" })
  .use(base)
  .handle("guildAvailable", async (ctx, guild) => {
    if (!ALLOWED_GUILDS.includes(guild.id)) {
      await leaveGuild(guild);
      return;
    }

    await processAllowedGuild(ctx, guild);

    if (guild.id === STRATA_CZASU.GUILD_ID) {
      // TODO: Decouple logger registration from guild creation, we should not rely on try/catch
      try {
        await registerGuildLogger(
          ctx.strataCzasuLog,
          guild,
          STRATA_CZASU.MOD_LOG_CHANNEL_ID,
        );
        ctx.strataCzasuLog.start(guild.client);
      } catch (e) {
        if (!(e instanceof DiscordAPIError)) {
          console.error("Failed to register Strata Czasu logger", e);
        } else {
          console.error(
            `Failed to register Strata Czasu logger: ${e.code} - ${e.message}`,
          );
        }
      }
    }

    console.log(`Guild available: ${guild.name}, owner: ${guild.ownerId}`);
  })
  .handle("guildCreate", async (ctx, guild) => {
    if (!ALLOWED_GUILDS.includes(guild.id)) {
      await leaveGuild(guild);
      return;
    }

    await processAllowedGuild(ctx, guild);
    console.log(`New guild: ${guild.name}, owner: ${guild.ownerId}`);
  })
  .handle("ready", async (ctx, client) => {
    ctx.messageLog.start(client);
    ctx.memberLog.start(client);
    ctx.roleLog.start(client);
    ctx.moderationLog.start(client);
    ctx.profileLog.start(client);
    ctx.economyLog.start(client);
    console.log("Loggers started");

    ctx.userTextActivityQueue.start(ctx.prisma, ctx.redis);
    ctx.stickyMessageCache.start(ctx.prisma);
    ctx.emojiCountingQueue.start(ctx.prisma, ctx.redis);
    console.log("Queues started");
  });
