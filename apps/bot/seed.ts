import { Prisma, prisma, redis } from "@hashira/db";
import {
  seedDefaultPlayerAbilities,
  seedMonstersForGuild,
} from "./src/events/halloween2025/seedData";
import {
  DEFAULT_ITEMS,
  DEFAULT_LOG_CHANNELS,
  GUILD_IDS,
  STRATA_CZASU_CURRENCY,
  USER_IDS,
} from "./src/specializedConstants";
import { ensureUserExists } from "./src/util/ensureUsersExist";
import { getGuildSetting } from "./src/util/getGuildSetting";

const isProduction = process.argv.includes("--production");

const createGuild = (guildId: string) =>
  prisma.guild.createMany({ data: { id: guildId }, skipDuplicates: true });

const createDefaultStrataCzasuCurrency = async (guildId: string) => {
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

const createDefaultItems = async (guildId: string) => {
  const existingItems = await prisma.item.findMany({
    where: { type: { in: DEFAULT_ITEMS.map((it) => it.type) } },
  });
  const existingItemTypes = existingItems.map((item) => item.type);
  console.log(
    `Default item types already exist in guild ${guildId}: ${existingItemTypes.join(", ")}`,
  );
  const itemTypesToCreate = DEFAULT_ITEMS.filter(
    ({ type }) => !existingItemTypes.includes(type),
  );
  for (const item of itemTypesToCreate) {
    await prisma.item.create({
      data: {
        ...item,
        guildId,
        createdBy: USER_IDS.Defous,
      },
    });
    console.log(`Created default item of type ${item.type} '${item.name}'`);
  }
};

const setDefaultLogChannels = async (guildId: string) => {
  const defaultLogChannels = getGuildSetting(DEFAULT_LOG_CHANNELS, guildId);
  if (!defaultLogChannels)
    throw new Error(`No default log channels defined for guild ${guildId}`);

  await createGuild(guildId);
  const settings = await prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });

  // Create a default logSettings configuration only if it doesn't exist
  try {
    await prisma.logSettings.create({
      data: {
        guildSettingsId: settings.id,
        messageLogChannelId: defaultLogChannels.MESSAGE,
        memberLogChannelId: defaultLogChannels.MEMBER,
        roleLogChannelId: defaultLogChannels.ROLE,
        moderationLogChannelId: defaultLogChannels.MODERATION,
        profileLogChannelId: defaultLogChannels.PROFILE,
        economyLogChannelId: defaultLogChannels.ECONOMY,
      },
    });
    console.log(`Created default logSettings for guild ${guildId}`);
  } catch (e) {
    // P2002: Unique constraint
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      console.log(`logSettings already exist for guild ${guildId}`);
      return;
    }
    throw e;
  }
};

if (isProduction) {
  await createGuild(GUILD_IDS.StrataCzasu);
  await createDefaultStrataCzasuCurrency(GUILD_IDS.StrataCzasu);
  await createDefaultItems(GUILD_IDS.StrataCzasu);
  await setDefaultLogChannels(GUILD_IDS.StrataCzasu);
  await seedDefaultPlayerAbilities(prisma);
  await seedMonstersForGuild(prisma, GUILD_IDS.StrataCzasu);
  console.log("Seeding completed for production environment");
} else {
  const testingServers = [GUILD_IDS.Homik, GUILD_IDS.Piwnica];
  for (const guildId of testingServers) {
    await createGuild(guildId);
    await createDefaultStrataCzasuCurrency(guildId);
    await createDefaultItems(guildId);
    await setDefaultLogChannels(guildId);
    await seedDefaultPlayerAbilities(prisma);
    await seedMonstersForGuild(prisma, guildId);
    console.log(`Seeding completed for test guild ${guildId}`);
  }
}

console.log(`Seeding completed for ${isProduction ? "production" : "dev"} environment`);

await prisma.$disconnect();
await redis.disconnect();
