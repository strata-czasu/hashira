import { prisma } from "@hashira/db";
import {
  DEFAULT_LOG_CHANNELS,
  GUILD_IDS,
  STRATA_CZASU_CURRENCY,
  USER_IDS,
} from "./src/specializedConstants";
import { ensureUserExists } from "./src/util/ensureUsersExist";

const isProduction = process.argv.includes("--production");

const createGuild = (guildId: string) =>
  prisma.guild.createMany({ data: { id: guildId }, skipDuplicates: true });

const createDefaultStrataCzasuCurrency = async (guildId: string) => {
  await createGuild(guildId);
  await ensureUserExists(prisma, USER_IDS.Defous);
  await prisma.currency.createMany({
    data: {
      guildId,
      name: STRATA_CZASU_CURRENCY.name,
      symbol: STRATA_CZASU_CURRENCY.symbol,
      createdBy: USER_IDS.Defous,
    },
    skipDuplicates: true,
  });
};

const setDefaultLogChannels = async (guildId: string) => {
  const defaultLogChannels =
    DEFAULT_LOG_CHANNELS[guildId as keyof typeof DEFAULT_LOG_CHANNELS];
  if (!defaultLogChannels) return;

  await createGuild(guildId);
  const settings = await prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
  // Set default log channels if none are set
  await prisma.guildSettings.update({
    data: {
      logSettings: {
        upsert: {
          create: {
            messageLogChannelId: defaultLogChannels.MESSAGE,
            memberLogChannelId: defaultLogChannels.MEMBER,
            roleLogChannelId: defaultLogChannels.ROLE,
            moderationLogChannelId: defaultLogChannels.MODERATION,
            profileLogChannelId: defaultLogChannels.PROFILE,
            economyLogChannelId: defaultLogChannels.ECONOMY,
          },
          update: {},
        },
      },
    },
    where: { id: settings.id },
  });
};

if (isProduction) {
  await createDefaultStrataCzasuCurrency(GUILD_IDS.StrataCzasu);
} else {
  const testingServers = [GUILD_IDS.Homik, GUILD_IDS.Piwnica];
  for (const guildId of testingServers) {
    await createDefaultStrataCzasuCurrency(guildId);
    await setDefaultLogChannels(guildId);
    console.log(`Seeding completed for test guild ${guildId}`);
  }
}

console.log(`Seeding completed for ${isProduction ? "production" : "dev"} environment`);

await prisma.$disconnect();
