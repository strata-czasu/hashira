import { type ExtractContext, Hashira, PaginatedView } from "@hashira/core";
import {
  DatabasePaginator,
  type ExtendedPrismaClient,
  type Halloween2025Monster,
  type Halloween2025MonsterSpawn,
} from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import { add, type Duration } from "date-fns";
import {
  ActionRowBuilder,
  ButtonBuilder,
  bold,
  type Client,
  ContainerBuilder,
  heading,
  type MessageCreateOptions,
  MessageFlags,
  roleMention,
  subtext,
  time,
} from "discord.js";
import { Data, Effect, Random } from "effect";
import { base } from "../../base";
import { GUILD_IDS } from "../../specializedConstants";
import { parseDuration, randomDuration } from "../../util/duration";
import { ensureUserExists } from "../../util/ensureUsersExist";
import { fetchMembers } from "../../util/fetchMembers";
import { getGuildSetting } from "../../util/getGuildSetting";
import { modifyMembers } from "../../util/modifyMembers";
import { weightedRandom } from "../../util/weightedRandom";
import { tokenShop } from "./tokenShop";
import { tokens } from "./tokens";

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

const sendToSpawnChannel = Effect.fn("sendToSpawnChannel")(function* (
  client: Client<true>,
  guildId: string,
  message: MessageCreateOptions,
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

  return yield* Effect.tryPromise(() => channel.send(message));
});

const sendSpawn = Effect.fn("sendSpawn")(function* (
  prisma: ExtendedPrismaClient,
  client: Client<true>,
  messageQueue: MessageQueueType,
  guildId: string,
  duration?: Duration,
  forcedMonster?: Halloween2025Monster,
) {
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
  const initialMessage = yield* sendToSpawnChannel(client, guildId, {
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

  const spawn = yield* Effect.tryPromise(() =>
    prisma.$transaction(async (tx) => {
      const spawn = await tx.halloween2025MonsterSpawn.create({
        data: {
          monster: { connect: { id: monster.id } },
          guild: { connect: { id: guildId } },
          channelId: initialMessage.channelId,
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

  return { monster, message, spawn };
});

export const halloween2025 = new Hashira({ name: "halloween2025" })
  .use(base)
  .use(tokens)
  .use(tokenShop)
  .group("halloween", (group) =>
    group
      .setDescription("Dowiedz się więcej o Halloween.")
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
      )
      .addCommand("add-to-role", (command) =>
        command
          .setDescription("Dodaj wszystkich uczestników eventu do roli")
          .addRole("role", (option) => option.setDescription("Rola do dodania"))
          .handle(async ({ prisma }, { role }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: MessageFlags.Ephemeral });

            const participants = await prisma.halloween2025MonsterLoot.findMany({
              where: {
                spawn: {
                  guildId: itx.guildId,
                },
              },
              distinct: ["userId"],
            });

            const guild = itx.guild;
            const roleInGuild = guild.roles.cache.get(role.id);
            if (!roleInGuild) {
              await itx.reply(`Rola nie została znaleziona na tym serwerze.`);
              return;
            }

            const members = await fetchMembers(
              guild,
              participants.map((p) => p.userId),
            );

            const results = await modifyMembers(
              members,
              (m) =>
                m.roles.add(role.id, `Dodano rolę uczestnikom eventu Halloween 2025`),
              (m) => m.roles.cache.has(role.id),
            );

            const added = results.filter((r) => r).length;

            await itx.followUp(
              `Dodano rolę ${roleMention(role.id)} ${bold(
                added.toString(),
              )} użytkownikom. ${bold(
                (members.size - added).toString(),
              )} użytkowników ma za wysokie permisje lub nie jest już na serwerze.`,
            );
          }),
      ),
  );
