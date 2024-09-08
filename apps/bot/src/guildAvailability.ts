import { Hashira } from "@hashira/core";
import { type ExtendedPrismaClient, Prisma } from "@hashira/db";
import { partition } from "es-toolkit";
import { base } from "./base";
import { GUILD_IDS } from "./specializedConstants";

const ALLOWED_GUILDS: string[] = Object.values(GUILD_IDS);

async function processAllowedGuild(prisma: ExtendedPrismaClient, guildId: string) {
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

export const guildAvailability = new Hashira({ name: "guild-availability" })
  .use(base)
  .handle("ready", async ({ prisma }, client) => {
    const [allowedGuilds, unallowedGuilds] = partition(
      [...client.guilds.cache.values()],
      (guild) => ALLOWED_GUILDS.includes(guild.id),
    );
    const creationPromises = allowedGuilds.map((guild) =>
      processAllowedGuild(prisma, guild.id),
    );

    const leavePromises = unallowedGuilds.map((guild) => {
      console.log(`Leaving guild: ${guild.name}, owner: ${guild.ownerId}`);
      return guild.leave();
    });

    await Promise.all([...creationPromises, ...leavePromises]);
  })
  .handle("guildCreate", async ({ prisma }, guild) => {
    if (!ALLOWED_GUILDS.includes(guild.id)) {
      console.log(`Leaving guild: ${guild.name}, owner: ${guild.ownerId}`);
      guild.leave();
      return;
    }

    await prisma.guild.createMany({
      data: { id: guild.id },
      skipDuplicates: true,
    });

    await prisma.guildSettings.createMany({
      data: { guildId: guild.id },
      skipDuplicates: true,
    });
  });
