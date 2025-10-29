import { type ExtractContext, Hashira, PaginatedView } from "@hashira/core";
import {
  DatabasePaginator,
  type ExtendedPrismaClient,
  type Halloween2025Monster,
  type Halloween2025MonsterCatchAttempt,
  type Halloween2025MonsterSpawn,
} from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import { add, type Duration } from "date-fns";
import {
  ActionRowBuilder,
  type APIMessageTopLevelComponent,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  ContainerBuilder,
  type ContainerComponent,
  channelMention,
  heading,
  type MessageCreateOptions,
  MessageFlags,
  subtext,
  TextDisplayBuilder,
  type TextDisplayComponent,
  time,
  userMention,
} from "discord.js";
import {
  Cron,
  Data,
  DateTime,
  Effect,
  Duration as EffectDuration,
  pipe,
  Random,
  Schedule,
} from "effect";
import { base } from "../../base";
import { GUILD_IDS } from "../../specializedConstants";
import { parseDuration, randomDuration } from "../../util/duration";
import { ensureUserExists } from "../../util/ensureUsersExist";
import { getGuildSetting } from "../../util/getGuildSetting";
import { weightedRandom } from "../../util/weightedRandom";

type MessageQueueType = ExtractContext<typeof base>["messageQueue"];

export const HALLOWEEN_2025_CHANNELS = {
  SPAWN_CHANNELS: {
    [GUILD_IDS.Homik]: "1431437264612753408",
    [GUILD_IDS.StrataCzasu]: "1431436993103003688",
  },
  NOTIFICATION_CHANNELS: {
    [GUILD_IDS.Homik]: ["1318731068165193848"],
    [GUILD_IDS.StrataCzasu]: ["683025889658929231"],
  },
};

const zone = DateTime.zoneUnsafeMakeNamed("Europe/Warsaw");
const HALLOWEEN_2025_START = {
  [GUILD_IDS.StrataCzasu]: DateTime.unsafeMakeZoned({
    year: 2025,
    month: 10,
    day: 29,
    hours: 16,
    minutes: 0,
    seconds: 0,
    zone,
  }),
  [GUILD_IDS.Homik]: DateTime.unsafeNow(),
};

const HALLOWEEN_2025_SCHEDULES: Record<
  string,
  Schedule.Schedule<unknown, unknown, never>
> = {
  [GUILD_IDS.StrataCzasu]: Schedule.jittered(
    Schedule.cron(Cron.unsafeParse("*/15 * * * *", zone)),
  ),
  [GUILD_IDS.Homik]: Schedule.fixed("10 seconds"),
};

const createSpawnComponent = (
  monster: Halloween2025Monster,
  spawn: Halloween2025MonsterSpawn,
) => {
  const lines = [
    heading(`:jack_o_lantern: Pojawił się potwór! :jack_o_lantern:`),
    ``,
    `W okolicy pojawił się potwór **${monster.name}**! Kliknij przycisk poniżej, aby spróbować go schwytać!`,
  ];

  return new ContainerBuilder()
    .addTextDisplayComponents((td) => td.setContent(lines.join("\n")))
    .addTextDisplayComponents((td) => td.setContent("Lista uczestników: (brak)"))
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

    yield* sendNotification(client, guildId, message);
  },
  Effect.catchTag("MonsterNotFoundError", (error) =>
    Effect.log(`[Halloween 2025] No monsters found for guild ${error.guildId}`),
  ),
);

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
      )
      .addCommand("kolekcja", (command) =>
        command
          .setDescription("Zobacz swoje schwytane potwory")
          .addUser("user", (option) =>
            option.setDescription("Użytkownik do sprawdzenia").setRequired(false),
          )
          .handle(async ({ prisma }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;

            const targetUser = user ?? itx.user;
            await ensureUserExists(prisma, targetUser);

            const where = {
              userId: targetUser.id,
              spawn: {
                guildId: itx.guildId,
                combatState: "completed_captured" as const,
              },
            };

            const paginate = new DatabasePaginator(
              (props, ordering) =>
                prisma.halloween2025MonsterLoot.findMany({
                  ...props,
                  where,
                  include: {
                    spawn: {
                      include: {
                        monster: true,
                      },
                    },
                  },
                  orderBy: [{ createdAt: ordering }, { id: ordering }],
                }),
              async () => {
                return await prisma.halloween2025MonsterLoot.count({ where });
              },
              { pageSize: 10, defaultOrder: PaginatorOrder.DESC },
            );

            const total = await prisma.halloween2025MonsterLoot.count({ where });

            const formatEntry = (
              item: {
                id: number;
                rank: number;
                damageDealt: number;
                spawn: { rarity: string; monster: { name: string } };
                createdAt: Date;
              },
              idx: number,
            ) => {
              const rarityEmojis = {
                common: "⚪",
                uncommon: "🟢",
                rare: "🔵",
                epic: "🟣",
                legendary: "🟡",
              };
              const rarityEmoji =
                rarityEmojis[item.spawn.rarity as keyof typeof rarityEmojis] ?? "⚪";
              const rankEmojis = ["🥇", "🥈", "🥉"];
              const rankEmoji = rankEmojis[item.rank - 1] ?? `#${item.rank}`;

              return (
                `${idx}\\.` +
                ` ${rarityEmoji} **${item.spawn.monster.name}** ${rankEmoji}` +
                ` - ${item.damageDealt.toLocaleString("pl-PL")} obrażeń` +
                ` (${time(item.createdAt, "R")})`
              );
            };

            const title = `🎃 Kolekcja potworów użytkownika ${targetUser.tag}`;
            const paginator = new PaginatedView(
              paginate,
              title,
              formatEntry,
              true,
              `Złapane potwory: ${total}`,
            );
            await paginator.render(itx);
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
            option
              .setDescription("Czas wygaśnięcia spawnu, np. '5m' lub '1h'")
              .setRequired(false),
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

              const duration = expiration ? parseDuration(expiration) : null;

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
                  duration ?? undefined,
                  monster,
                ),
              );
            },
          ),
      ),
  )
  .handle("guildAvailable", async ({ prisma, messageQueue }, guild) => {
    const start = getGuildSetting(HALLOWEEN_2025_START, guild.id);
    const runSchedule = getGuildSetting(HALLOWEEN_2025_SCHEDULES, guild.id);

    if (!start || !runSchedule) return;

    handleGuild(prisma, guild.client, messageQueue, guild.id).pipe(
      Effect.catchAll(Effect.logError),
      Effect.schedule(runSchedule),
      Effect.delay(
        pipe(DateTime.distance(DateTime.unsafeNow(), start), EffectDuration.millis),
      ),
      Effect.runFork,
    );
  })
  .handle("clientReady", async ({ prisma }, client) => {
    client.on("interactionCreate", async (itx) => {
      if (!itx.isButton()) return;
      if (!itx.customId.startsWith("halloween2025-catch:")) return;
      if (!itx.inCachedGuild()) return;

      const [, spawnIdStr] = itx.customId.split(":");
      const spawnId = Number(spawnIdStr);
      if (Number.isNaN(spawnId)) return;

      await itx.deferReply({ flags: MessageFlags.Ephemeral });
      await ensureUserExists(prisma, itx.user);

      const result = await prisma.$transaction(async (tx) => {
        const spawn = await tx.halloween2025MonsterSpawn.findUnique({
          where: { id: spawnId },
          select: { expiresAt: true, guildId: true, channelId: true, messageId: true },
        });

        if (!spawn) return { value: null, error: "Spawn not found" } as const;

        const expiresAt = DateTime.unsafeFromDate(spawn.expiresAt);
        const itxCreatedAt = DateTime.unsafeFromDate(itx.createdAt);
        if (DateTime.greaterThanOrEqualTo(itxCreatedAt, expiresAt)) {
          return { value: null, error: "Spawn has expired" } as const;
        }

        // Check if user has already attempted to catch this spawn
        const existingAttempt = await tx.halloween2025MonsterCatchAttempt.findUnique({
          where: {
            userId_spawnId: {
              userId: itx.user.id,
              spawnId,
            },
          },
        });

        if (existingAttempt) {
          return { value: null, error: "Already attempted" } as const;
        }

        await tx.halloween2025MonsterCatchAttempt.create({
          data: {
            userId: itx.user.id,
            spawnId,
          },
        });

        // Fetch all participants to rebuild the list from database
        const allAttempts = await tx.halloween2025MonsterCatchAttempt.findMany({
          where: { spawnId },
          orderBy: { attemptedAt: "asc" },
        });

        return {
          value: { ...spawn, participants: allAttempts },
          error: null,
        } as const;
      });

      if (result.error) {
        if (result.error === "Already attempted") {
          await itx.editReply({
            content: `Już dołączyłeś do tej wyprawy! Czekaj na wynik.`,
          });
        } else {
          await itx.editReply({
            content: `Niestety, potwór już zniknął... Spróbuj szybciej następnym razem!`,
          });
        }
        return;
      }

      const monsterMessageChannel = await itx.guild.channels.fetch(
        result.value.channelId,
      );
      if (!monsterMessageChannel?.isTextBased()) {
        await itx.editReply({
          content: `Nie udało się znaleźć wiadomości z potworem. Skontaktuj się z developerem.`,
        });

        return;
      }

      const monsterMessage = await monsterMessageChannel?.messages.fetch(
        result.value.messageId,
      );

      if (!monsterMessage) {
        await itx.editReply({
          content: `Nie udało się znaleźć wiadomości z potworem. Skontaktuj się z developerem.`,
        });

        return;
      }

      const [displayContainer, ...rest] = monsterMessage.components as [
        ContainerComponent,
        ...APIMessageTopLevelComponent[],
      ];
      const textComponent = displayContainer.components[1] as TextDisplayComponent;

      // Rebuild participant list from database
      const participantLines = await Promise.all(
        result.value.participants.map(
          async (attempt: Halloween2025MonsterCatchAttempt) => {
            const user = await itx.client.users.fetch(attempt.userId).catch(() => null);
            const username = user?.username ?? attempt.userId;
            return `- ${userMention(attempt.userId)} (${username})`;
          },
        ),
      );

      const newContent =
        participantLines.length > 0
          ? `Lista uczestników:\n${participantLines.join("\n")}`
          : `Lista uczestników: (brak)`;

      const textComponentBuilder = new TextDisplayBuilder(
        textComponent.toJSON(),
      ).setContent(newContent);
      const displayComponents = new ContainerBuilder(
        displayContainer.toJSON(),
      ).spliceComponents(1, 1, textComponentBuilder);

      await monsterMessage.edit({
        components: [displayComponents, ...rest],
      });

      await itx.editReply({
        content: `Dołączono do wyprawy, powodzenia w łapaniu.`,
      });
    });
  });
