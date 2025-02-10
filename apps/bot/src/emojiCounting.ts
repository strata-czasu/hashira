import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator } from "@hashira/db";
import {
  AttachmentBuilder,
  type GuildEmoji,
  type GuildEmojiManager,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from "discord.js";
import { base } from "./base";
import { parseDate } from "./util/dateParsing";
import { discordTry } from "./util/discordTry";
import { errorFollowUp } from "./util/errorFollowUp";

const EMOJI_REGEX = /(?<!\\)<a?:[^:]+:(\d+)>/g;

const parseEmojis = (guildEmojiManager: GuildEmojiManager, content: string) => {
  const matches = content.matchAll(EMOJI_REGEX);
  if (!matches) return [];

  const emojis: GuildEmoji[] = [];
  for (const match of matches) {
    const emojiId = match[1];
    if (!emojiId) continue;
    const emoji = guildEmojiManager.resolve(emojiId);
    if (!emoji) continue;
    emojis.push(emoji);
  }

  return emojis;
};

export const emojiCounting = new Hashira({ name: "emoji-parsing" })
  .use(base)
  .handle("guildMessageCreate", async ({ prisma }, message) => {
    // TODO: Consider adding a helper? an util? for easier checking of bots
    if (message.author.bot) return;

    const matches = message.content.matchAll(EMOJI_REGEX);
    if (!matches) return;

    const guildEmojis = parseEmojis(message.guild.emojis, message.content);
    if (guildEmojis.length === 0) return;

    await prisma.emojiUsage.createMany({
      data: guildEmojis.map((emoji) => ({
        userId: message.author.id,
        emojiId: emoji.id,
        guildId: message.guild.id,
      })),
    });
  })
  .group("emojistats", (group) =>
    group
      .setDescription("Get emoji usage stats")
      .addCommand("user", (command) =>
        command
          .setDescription("Get emoji usage stats for a user")
          .addUser("user", (option) =>
            option.setDescription("The user to get stats for"),
          )
          .addString("after", (option) =>
            option.setDescription("The date to end at").setRequired(false),
          )
          .addString("before", (option) =>
            option.setDescription("The date to start from").setRequired(false),
          )
          .handle(
            async ({ prisma }, { user, after: rawAfter, before: rawBefore }, itx) => {
              if (!itx.inCachedGuild()) return;

              const after = parseDate(rawAfter, "start", () => new Date(0));
              const before = parseDate(rawBefore, "end", () => new Date());

              const where = {
                userId: user.id,
                timestamp: { gte: after, lte: before },
              };

              const paginate = new DatabasePaginator(
                (props, ordering) =>
                  prisma.emojiUsage.groupBy({
                    ...props,
                    by: "emojiId",
                    where,
                    _count: true,
                    orderBy: [{ _count: { emojiId: ordering } }, { emojiId: ordering }],
                  }),
                async () => {
                  const count = await prisma.emojiUsage.groupBy({
                    by: "emojiId",
                    where,
                  });
                  return count.length;
                },
              );

              const paginator = new PaginatedView(
                paginate,
                `Emoji stats for <@${user.id}>`,
                (item, idx) => `${idx}. ${item.emojiId} - ${item._count}`,
                true,
              );

              await paginator.render(itx);
            },
          ),
      )
      .addCommand("emoji", (command) =>
        command
          .setDescription("Get emoji usage stats for an emoji")
          .addString("emoji", (option) =>
            option.setDescription("The emoji to get stats for"),
          )
          .addString("after", (option) =>
            option.setDescription("The date to end at").setRequired(false),
          )
          .addString("before", (option) =>
            option.setDescription("The date to start from").setRequired(false),
          )
          .handle(
            async (
              { prisma },
              { emoji: rawEmoji, after: rawAfter, before: rawBefore },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              const emojis = parseEmojis(itx.guild.emojis, rawEmoji);

              const [emoji] = emojis;

              if (emojis.length !== 1 || !emoji) {
                return await errorFollowUp(itx, "Please provide exactly one emoji");
              }

              const after = parseDate(rawAfter, "start", () => new Date(0));
              const before = parseDate(rawBefore, "end", () => new Date());

              const where = {
                emojiId: emoji.id,
                timestamp: { gte: after, lte: before },
              };

              const paginate = new DatabasePaginator(
                (props, ordering) =>
                  prisma.emojiUsage.groupBy({
                    ...props,
                    by: "userId",
                    where,
                    _count: true,
                    orderBy: [{ _count: { userId: ordering } }, { userId: ordering }],
                  }),
                async () => {
                  const count = await prisma.emojiUsage.groupBy({
                    by: "userId",
                    where,
                  });
                  return count.length;
                },
              );

              const paginator = new PaginatedView(
                paginate,
                `Emoji stats for ${emoji.name}`,
                (item, idx) => `${idx}. <@${item.userId}> - ${item._count}`,
                true,
              );

              await paginator.render(itx);
            },
          ),
      )
      .addCommand("guild", (command) =>
        command
          .setDescription("Get emoji usage stats for the guild")
          .addString("after", (option) =>
            option.setDescription("The date to end at").setRequired(false),
          )
          .addString("before", (option) =>
            option.setDescription("The date to start from").setRequired(false),
          )
          .handle(async ({ prisma }, { after: rawAfter, before: rawBefore }, itx) => {
            if (!itx.inCachedGuild()) return;

            const after = parseDate(rawAfter, "start", () => new Date(0));
            const before = parseDate(rawBefore, "end", () => new Date());

            const where = {
              guildId: itx.guild.id,
              timestamp: { gte: after, lte: before },
            };

            const paginate = new DatabasePaginator(
              (props, ordering) =>
                prisma.emojiUsage.groupBy({
                  ...props,
                  by: "emojiId",
                  where,
                  _count: true,
                  orderBy: [{ _count: { emojiId: ordering } }, { emojiId: ordering }],
                }),
              async () => {
                const count = await prisma.emojiUsage.groupBy({
                  by: "emojiId",
                  where,
                });
                return count.length;
              },
            );

            const paginator = new PaginatedView(
              paginate,
              "Guild emoji stats",
              async (item, idx) => {
                const emoji = await discordTry(
                  () => itx.guild.emojis.fetch(item.emojiId),
                  [RESTJSONErrorCodes.UnknownEmoji],
                  () => "unknown emoji",
                );

                return `${idx}. ${emoji} - ${item._count}`;
              },
              true,
            );

            await paginator.render(itx);
          }),
      )
      .addCommand("prune", (command) =>
        command
          .setDescription("Prune removed emojis from the database")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            if (
              !itx.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)
            ) {
              return await errorFollowUp(
                itx,
                "You do not have the required permissions to run this command",
              );
            }

            const guildEmojis = itx.guild.emojis.cache;
            const emojiIds = guildEmojis.map((emoji) => emoji.id);

            await prisma.emojiUsage.deleteMany({
              where: {
                guildId: itx.guild.id,
                NOT: { emojiId: { in: emojiIds } },
              },
            });

            await itx.reply("Pruned removed emojis");
          }),
      )
      .addCommand("unused", (command) =>
        command
          .setDescription("Get unused emojis in the guild")
          .addString("after", (option) =>
            option.setDescription("The date to end at").setRequired(false),
          )
          .addString("before", (option) =>
            option.setDescription("The date to start from").setRequired(false),
          )
          .handle(async ({ prisma }, { after: rawAfter, before: rawBefore }, itx) => {
            if (!itx.inCachedGuild()) return;

            const after = parseDate(rawAfter, "start", () => new Date(0));
            const before = parseDate(rawBefore, "end", () => new Date());

            const guildEmojis = await itx.guild.emojis.fetch();

            const emojiUsages = await prisma.emojiUsage.findMany({
              distinct: ["emojiId"],
              where: {
                guildId: itx.guild.id,
                timestamp: { gte: after, lte: before },
              },
              select: { emojiId: true },
              orderBy: { emojiId: "asc" },
            });

            const usedEmojiIds = emojiUsages.map((usage) => usage.emojiId);
            const unusedEmojis = guildEmojis.filter(
              (emoji) => !usedEmojiIds.includes(emoji.id),
            );

            const content = unusedEmojis.map((emoji) => emoji.name).join("\n");

            await itx.reply({
              files: [
                new AttachmentBuilder(Buffer.from(content), {
                  name: "unused-emojis.txt",
                }),
              ],
            });
          }),
      ),
  );
