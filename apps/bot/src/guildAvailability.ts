import { type ExtractContext, Hashira } from "@hashira/core";
import { type ExtendedPrismaClient, Prisma } from "@hashira/db";
import type { Guild } from "discord.js";
import { partition } from "es-toolkit";
import { base } from "./base";
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

async function registerGuildLogger(
  prisma: ExtendedPrismaClient,
  guild: Guild,
  log: BaseContext["log"],
) {
  const settings = await prisma.guildSettings.findFirst({
    where: { guildId: guild.id },
  });
  if (!settings?.logChannelId) return;

  const channel = await guild.channels.fetch(settings.logChannelId);
  if (!channel)
    throw new Error(
      `Log channel ${settings.logChannelId} not found for guild ${guild.id}`,
    );
  if (!channel.isTextBased())
    throw new Error(
      `Log channel ${settings.logChannelId} for guild ${guild.id} is not text based`,
    );

  log.addGuild(guild, channel);
}

async function processAllowedGuild(
  prisma: ExtendedPrismaClient,
  guild: Guild,
  log: BaseContext["log"],
) {
  await createGuildSettings(prisma, guild.id);
  await registerGuildLogger(prisma, guild, log);
}

export const guildAvailability = new Hashira({ name: "guild-availability" })
  .use(base)
  .handle("ready", async ({ prisma, log }, client) => {
    const [allowedGuilds, unallowedGuilds] = partition(
      [...client.guilds.cache.values()],
      (guild) => ALLOWED_GUILDS.includes(guild.id),
    );
    const creationPromises = allowedGuilds.map((guild) =>
      processAllowedGuild(prisma, guild, log),
    );

    const leavePromises = unallowedGuilds.map((guild) => {
      console.log(`Leaving guild: ${guild.name}, owner: ${guild.ownerId}`);
      return guild.leave();
    });

    await Promise.all([...creationPromises, ...leavePromises]);
    log.startConsumeLoops(client);
  })
  .handle("guildCreate", async ({ prisma, log }, guild) => {
    if (!ALLOWED_GUILDS.includes(guild.id)) {
      console.log(`Leaving guild: ${guild.name}, owner: ${guild.ownerId}`);
      guild.leave();
      return;
    }

    await processAllowedGuild(prisma, guild, log);
  });
