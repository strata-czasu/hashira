import { Hashira } from "@hashira/core";
import { base } from "./base";

export const guildAvailability = new Hashira({ name: "guild-availability" })
  .use(base)
  .handle("ready", async ({ prisma }, client) => {
    const guilds = client.guilds.cache.map((guild) => ({ id: guild.id }));

    await prisma.guild.createMany({ data: guilds, skipDuplicates: true });

    const guildSettings = client.guilds.cache.map((guild) => ({ guildId: guild.id }));

    await prisma.guildSettings.createMany({
      data: guildSettings,
      skipDuplicates: true,
    });
  })
  .handle("guildCreate", async ({ prisma }, guild) => {
    await prisma.guild.createMany({
      data: { id: guild.id },
      skipDuplicates: true,
    });

    await prisma.guildSettings.createMany({
      data: { guildId: guild.id },
      skipDuplicates: true,
    });
  });
