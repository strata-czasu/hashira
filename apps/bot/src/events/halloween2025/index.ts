import { type ExtractContext, Hashira } from "@hashira/core";
import type {
  ExtendedPrismaClient,
  Halloween2025Monster,
  Halloween2025MonsterSpawn,
} from "@hashira/db";
import { add, type Duration } from "date-fns";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  ContainerBuilder,
  channelMention,
  heading,
  type MessageCreateOptions,
  MessageFlags,
  subtext,
  time,
} from "discord.js";
import { Context, Cron, Data, DateTime, Effect, Random, Schedule } from "effect";
import { base } from "../../base";
import { GUILD_IDS } from "../../specializedConstants";
import { parseDuration, randomDuration } from "../../util/duration";
import { ensureUserExists } from "../../util/ensureUsersExist";
import { errorFollowUp } from "../../util/errorFollowUp";
import { getGuildSetting } from "../../util/getGuildSetting";
import { weightedRandom } from "../../util/weightedRandom";

type MessageQueueType = ExtractContext<typeof base>["messageQueue"];

export const HALLOWEEN_2025_CHANNELS = {
  SPAWN_CHANNELS: {
    [GUILD_IDS.Homik]: "1431437264612753408",
  },
  NOTIFICATION_CHANNELS: {
    [GUILD_IDS.Homik]: ["1318731068165193848"],
  },
};

class PrismaReader extends Context.Tag("Prisma")<
  PrismaReader,
  { readonly getPrisma: Effect.Effect<ExtendedPrismaClient> }
>() {}

class ClientReader extends Context.Tag("Client")<
  ClientReader,
  { readonly getClient: Effect.Effect<Client<true>> }
>() {}

class MessageQueueReader extends Context.Tag("MessageQueue")<
  MessageQueueReader,
  { readonly getMessageQueue: Effect.Effect<MessageQueueType> }
>() {}

const zone = DateTime.zoneUnsafeMakeNamed("Europe/Warsaw");

// 12 PM Polish Time on October 25th, 2025
// const START_DATE = DateTime.unsafeMakeZoned({
//   year: 2025,
//   month: 10,
//   day: 25,
//   hours: 12,
//   minutes: 0,
//   seconds: 0,
//   zone,
// });
const START_DATE = DateTime.unsafeNow().pipe(DateTime.addDuration("1 seconds"));

const CRON = Cron.make({
  minutes: [],
  hours: [],
  days: [],
  months: [],
  weekdays: [],
  seconds: [0],
  tz: DateTime.zoneUnsafeMakeNamed("Europe/Warsaw"),
});

// const schedule = Schedule.cron(CRON);
const schedule = Schedule.fixed("2 second");

const createSpawnComponent = (
  monster: Halloween2025Monster,
  spawn: Halloween2025MonsterSpawn,
) => {
  const lines = [
    heading(`:jack_o_lantern: Potwór się pojawił! :jack_o_lantern:`),
    ``,
    `W okolicy pojawił się potwór **${monster.name}**! Kliknij przycisk poniżej, aby spróbować go schwytać!`,
  ];

  return new ContainerBuilder()
    .addTextDisplayComponents((td) => td.setContent(lines.join("\n")))
    .addMediaGalleryComponents((mg) =>
      mg.addItems((mgib) => mgib.setURL(monster.image)),
    )
    .addTextDisplayComponents((td) =>
      td.setContent(subtext(`Zamyka się za ${time(spawn.expiresAt, "R")}`)),
    );
};

const isNonEmptyArray = <T>(arr: T[]): arr is [T, ...T[]] => arr.length > 0;

class MonsterNotFoundError extends Data.TaggedError("MonsterNotFoundError")<{
  readonly guildId: string;
}> {}

const getMonster = Effect.fn("getMonster")(function* (
  prisma: ExtendedPrismaClient,
  guildId: string,
  forcedMonster?: Halloween2025Monster,
) {
  if (forcedMonster) {
    return forcedMonster;
  }

  const monsters = yield* Effect.tryPromise(async () => {
    return await prisma.halloween2025Monster.findMany({
      where: { guildId },
    });
  });

  if (!isNonEmptyArray(monsters)) {
    return yield* new MonsterNotFoundError({ guildId });
  }

  return weightedRandom(monsters, (monster) => monster.weight);
});

const rarityToExpiration = {
  common: { minMinutes: 5, maxMinutes: 15 },
  uncommon: { minMinutes: 15, maxMinutes: 30 },
  rare: { minMinutes: 30, maxMinutes: 45 },
  epic: { minMinutes: 45, maxMinutes: 60 },
  legendary: { minMinutes: 60, maxMinutes: 75 },
};

const getDuration = (rarity: keyof typeof rarityToExpiration, duration?: Duration) => {
  if (duration) return duration;
  const { minMinutes, maxMinutes } = rarityToExpiration[rarity];

  return randomDuration({ minutes: minMinutes }, { minutes: maxMinutes }, Math.random);
};

const sendSpawn = Effect.fn("sendSpawn")(function* (
  prisma: ExtendedPrismaClient,
  client: Client<true>,
  messageQueue: MessageQueueType,
  guildId: string,
  duration?: Duration,
  forcedMonster?: Halloween2025Monster,
) {
  const guildSettings = getGuildSetting(
    HALLOWEEN_2025_CHANNELS.SPAWN_CHANNELS,
    guildId,
  );

  if (!guildSettings)
    return yield* Effect.die(
      `No halloween2025 channel configured for guild ${guildId}`,
    );

  const channel = client.channels.cache.get(guildSettings) ?? null;

  if (!channel?.isSendable() || channel.isDMBased())
    return yield* Effect.fail(
      `Channel ${channel?.id} is not sendable in guild ${guildId}`,
    );

  const rarity = yield* Random.choice([
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary",
  ] as const);
  const expirationDuration = getDuration(rarity, duration);
  const now = new Date();
  const expiresAt = add(now, expirationDuration);

  const monster = yield* getMonster(prisma, guildId, forcedMonster);

  const initialMessage = yield* Effect.tryPromise(async () => {
    return await channel.send({
      components: [
        new ContainerBuilder().addTextDisplayComponents((td) =>
          td.setContent(`Przygotowuję się do pojawienia się potwora...`),
        ),
        new ActionRowBuilder<ButtonBuilder>({
          components: [
            new ButtonBuilder({
              customId: `halloween2025-catch:placeholder`,
              emoji: "🎃",
              label: "Łap",
              style: 1,
              disabled: true,
            }),
          ],
        }),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  });

  const spawn = yield* Effect.tryPromise(() =>
    prisma.$transaction(async (tx) => {
      const spawn = await tx.halloween2025MonsterSpawn.create({
        data: {
          monster: { connect: { id: monster.id } },
          guild: { connect: { id: guildId } },
          channelId: channel.id,
          messageId: initialMessage.id,
          expiresAt: expiresAt,
          rarity,
        },
      });

      await messageQueue.push(
        "halloween2025endSpawn",
        { spawnId: spawn.id },
        expiresAt,
        String(spawn.id),
        tx,
      );

      return spawn;
    }),
  );

  const message = yield* Effect.tryPromise(async () => {
    return await initialMessage.edit({
      components: [
        createSpawnComponent(monster, spawn),
        new ActionRowBuilder<ButtonBuilder>({
          components: [
            new ButtonBuilder({
              customId: `halloween2025-catch:${spawn.id}`,
              emoji: "🎃",
              label: "Łap",
              style: 1,
            }),
          ],
        }),
      ],
    });
  });

  return { monster, message };
});

const sendNotification = Effect.fn("sendNotification")(function* (
  prisma: ExtendedPrismaClient,
  client: Client<true>,
  guildId: string,
  message: MessageCreateOptions,
) {
  const guildSettings = getGuildSetting(
    HALLOWEEN_2025_CHANNELS.NOTIFICATION_CHANNELS,
    guildId,
  );

  if (!guildSettings || guildSettings.length === 0) {
    return yield* Effect.die(
      `No halloween2025 notification channels configured for guild ${guildId}`,
    );
  }

  const notificationChannels = guildSettings
    .map((channelId) => client.channels.cache.get(channelId) ?? null)
    .filter((channel) => channel !== null)
    .filter((channel) => channel.isSendable() && !channel.isDMBased());

  yield* Effect.all(
    notificationChannels.map((channel) =>
      Effect.tryPromise(() => channel.send(message)),
    ),
    { concurrency: "unbounded" },
  ).pipe(Effect.parallelErrors);
});

const handleGuild = Effect.fn("handleGuild")(
  function* (
    prisma: ExtendedPrismaClient,
    client: Client<true>,
    messageQueue: MessageQueueType,
    guildId: string,
  ) {
    const guildSettings = getGuildSetting(
      HALLOWEEN_2025_CHANNELS.SPAWN_CHANNELS,
      guildId,
    );

    if (!guildSettings) return yield* Effect.die("No halloween2025 channel configured");

    const channel = client.channels.cache.get(guildSettings) ?? null;

    if (!channel?.isTextBased()) return yield* Effect.fail("Channel is not text based");

    const { message: spawnMessage } = yield* sendSpawn(
      prisma,
      client,
      messageQueue,
      guildId,
    );

    const message = {
      components: [
        new ContainerBuilder().addTextDisplayComponents((td) =>
          td.setContent(
            `W okolicy pojawił się potwór! Sprawdź kanał ${channelMention(channel.id)}, aby spróbować go schwytać!`,
          ),
        ),
        new ActionRowBuilder<ButtonBuilder>({
          components: [
            new ButtonBuilder({
              label: "Idź do kanału",
              style: ButtonStyle.Link,
              url: spawnMessage.url,
            }),
          ],
        }),
      ],
      flags: MessageFlags.IsComponentsV2,
    } satisfies MessageCreateOptions;

    yield* sendNotification(prisma, client, guildId, message);
  },
  Effect.catchTag("MonsterNotFoundError", (error) =>
    Effect.log(`[Halloween 2025] No monsters found for guild ${error.guildId}`),
  ),
);

const program = Effect.repeat(
  Effect.gen(function* () {
    const prismaReader = yield* PrismaReader;
    const prisma = yield* prismaReader.getPrisma;
    const clientReader = yield* ClientReader;
    const client = yield* clientReader.getClient;
    const messageQueueReader = yield* MessageQueueReader;
    const messageQueue = yield* messageQueueReader.getMessageQueue;

    yield* Effect.all(
      client.guilds.cache.map((guild) =>
        handleGuild(prisma, client, messageQueue, guild.id),
      ),
      { concurrency: "unbounded" },
    ).pipe(Effect.asVoid, Effect.parallelErrors);
  }),
  // schedule,
  schedule.pipe(Schedule.intersect(Schedule.recurs(1))),
).pipe(Effect.delay(DateTime.distanceDuration(DateTime.unsafeNow(), START_DATE)));

export const halloween2025 = new Hashira({ name: "halloween2025" })
  .use(base)
  .group("halloween", (group) =>
    group
      .setDescription("Dowiedz się więcej o Halloween.")
      .addCommand("info", (command) =>
        command
          .setDescription("Informacje o wydarzeniu Halloween 2025")
          .handle(async (_, __, itx) => {
            if (!itx.inCachedGuild()) return;
            const spawnChannel = getGuildSetting(
              HALLOWEEN_2025_CHANNELS.SPAWN_CHANNELS,
              itx.guildId,
            );

            if (!spawnChannel) {
              await itx.reply({
                content: `Kanał wydarzenia Halloween 2025 nie został skonfigurowany na tym serwerze.`,
                flags: [MessageFlags.Ephemeral],
              });
              return;
            }

            const lines = [
              heading("🎃 Event Halloween 🎃"),
              ``,
              `Co jakiś czas na ${channelMention(spawnChannel)} pojawi się potwór, którego będzie można spróbować schwytać klikając przycisk "Łap".`,
              `Jeśli uda Ci się schwytać potwora, otrzymasz specjalną nagrodę!`,
              ``,
              `Czasem potwory pojawiają się w parach lub większych grupach, więc warto być czujnym!`,
              `A czasem pojawiają się tylko w reakcji na specjalne wydarzenia na serwerze... Kto wie, co przyniesie Halloween w tym roku?`,
              ``,
              `Bądź czujny i nie przegap swojej szansy na złapanie potwora!`,
            ];

            const components = new ContainerBuilder()
              .addTextDisplayComponents((td) => td.setContent(lines.join("\n")))
              .addMediaGalleryComponents((mg) =>
                mg.addItems((mgi) => mgi.setURL("https://i.imgur.com/8FbNC9u.jpeg")),
              );

            await itx.reply({
              components: [components],
              flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            });
          }),
      ),
  )
  .group("halloween-admin", (group) =>
    group
      .setDescription("Halloween 2025 event administration commands")
      .setDefaultMemberPermissions(0)
      .addCommand("add-monster", (command) =>
        command
          .setDescription("Dodaj potwora do wydarzenia Halloween 2025")
          .addString("name", (option) => option.setDescription("Nazwa potwora"))
          .addInteger("weight", (option) =>
            option.setDescription("Waga potwora").setMinValue(1),
          )
          .addString("image-url", (option) =>
            option.setDescription("URL obrazka potwora"),
          )
          .handle(async ({ prisma }, { name, weight, "image-url": image }, itx) => {
            if (!itx.inCachedGuild()) return;

            const monster = await prisma.halloween2025Monster.create({
              data: {
                name,
                weight,
                image,
                guildId: itx.guildId,
              },
            });

            await itx.reply(
              `Dodano potwora **${monster.name}** o wadze ${monster.weight}.`,
            );
          }),
      )
      .addCommand("force-spawn", (command) =>
        command
          .setDescription("Wymuś pojawienie się potwora Halloween 2025")
          .addString("monster-id", (option) =>
            option.setAutocomplete(true).setDescription("ID potwora"),
          )
          .addString("expiration", (option) =>
            option.setDescription("Czas wygaśnięcia spawnu, np. '5m' lub '1h'"),
          )
          .autocomplete(async ({ prisma }, { "monster-id": partial }, itx) => {
            if (!itx.inCachedGuild()) return;

            const monsters = await prisma.halloween2025Monster.findMany({
              where: {
                guildId: itx.guildId,
                name: { contains: partial, mode: "insensitive" },
              },
              take: 25,
            });

            return itx.respond(
              monsters.map((monster) => ({
                name: `${monster.name} (ID: ${monster.id})`,
                value: String(monster.id),
              })),
            );
          })
          .handle(
            async (
              { prisma, messageQueue },
              { "monster-id": monsterId, expiration },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              const duration = parseDuration(expiration);

              if (!duration) {
                return errorFollowUp(
                  itx,
                  "Nieprawidłowy format czasu wygaśnięcia. Użyj czegoś takiego jak '5m' lub '1h'.",
                );
              }

              const monster = await prisma.halloween2025Monster.findUnique({
                where: { id: Number(monsterId) },
              });

              if (!monster) {
                await itx.reply(`Nie znaleziono potwora o ID ${monsterId}.`);
                return;
              }

              await Effect.runPromise(
                sendSpawn(
                  prisma,
                  itx.client,
                  messageQueue,
                  itx.guildId,
                  duration,
                  monster,
                ),
              );
            },
          ),
      ),
  )
  .handle("clientReady", async ({ prisma, messageQueue }, client) => {
    program.pipe(
      Effect.provideService(PrismaReader, { getPrisma: Effect.succeed(prisma) }),
      Effect.provideService(ClientReader, { getClient: Effect.succeed(client) }),
      Effect.provideService(MessageQueueReader, {
        getMessageQueue: Effect.succeed(messageQueue),
      }),
      Effect.catchAll(Effect.logError),
      Effect.runFork,
    );

    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith("halloween2025-catch:")) return;
      if (!interaction.inCachedGuild()) return;

      const [, spawnIdStr] = interaction.customId.split(":");
      const spawnId = Number(spawnIdStr);
      if (Number.isNaN(spawnId)) return;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await ensureUserExists(prisma, interaction.user);

      const result = await prisma.$transaction(async (tx) => {
        const spawn = await tx.halloween2025MonsterSpawn.findUnique({
          where: { id: spawnId },
          select: { expiresAt: true },
        });

        if (!spawn) return { success: false, error: "Spawn not found" } as const;

        const expiresAt = DateTime.unsafeFromDate(spawn.expiresAt);
        const itxCreatedAt = DateTime.unsafeFromDate(interaction.createdAt);
        if (DateTime.greaterThanOrEqualTo(itxCreatedAt, expiresAt)) {
          return { success: false, error: "Spawn has expired" } as const;
        }

        await tx.halloween2025MonsterCatchAttempt.create({
          data: {
            userId: interaction.user.id,
            spawnId: spawnId,
          },
        });

        return { success: true, error: null } as const;
      });

      if (result.error) {
        await interaction.editReply({
          content: `Niestety, potwór już zniknął... Spróbuj szybciej następnym razem!`,
        });
        return;
      }

      await interaction.editReply({
        content: `Spróbowałeś schwytać potwora! Dowiesz się wkrótce, czy Twoja ekspedycja zakończyła się powodzeniem.`,
      });
    });
  });
