import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator } from "@hashira/db";
import {
  and,
  between,
  count,
  countDistinct,
  eq,
  notInArray,
} from "@hashira/db/drizzle";
import { emojiUsage } from "@hashira/db/schema";
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
  .handle("guildMessageCreate", async ({ db }, message) => {
    // TODO: Consider adding a helper? an util? for easier checking of bots
    if (message.author.bot) return;

    const matches = message.content.matchAll(EMOJI_REGEX);
    if (!matches) return;

    const guildEmojis = parseEmojis(message.guild.emojis, message.content);
    if (guildEmojis.length === 0) return;

    await db.insert(emojiUsage).values(
      guildEmojis.map((emoji) => ({
        userId: message.author.id,
        emojiId: emoji.id,
        guildId: message.guild.id,
      })),
    );
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
          .handle(async ({ db }, { user, after: rawAfter, before: rawBefore }, itx) => {
            if (!itx.inCachedGuild()) return;

            const after = parseDate(rawAfter, "start", () => new Date(0));
            const before = parseDate(rawBefore, "end", () => new Date());

            const where = and(
              eq(emojiUsage.userId, user.id),
              between(emojiUsage.timestamp, after, before),
            );

            const paginate = new DatabasePaginator({
              orderBy: [count(), emojiUsage.emojiId],
              select: db
                .select({ emojiId: emojiUsage.emojiId, count: count() })
                .from(emojiUsage)
                .where(where)
                .groupBy(emojiUsage.emojiId)
                .$dynamic(),
              count: db
                .select({ count: countDistinct(emojiUsage.emojiId) })
                .from(emojiUsage)
                .where(where)
                .$dynamic(),
            });

            const paginator = new PaginatedView(
              paginate,
              `Emoji stats for <@${user.id}>`,
              (item, idx) => `${idx}. ${item.emojiId} - ${item.count}`,
              true,
            );

            await paginator.render(itx);
          }),
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
              { db },
              { emoji: rawEmoji, after: rawAfter, before: rawBefore },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              const emojis = parseEmojis(itx.guild.emojis, rawEmoji);

              const [emoji] = emojis;

              if (emojis.length !== 1 || !emoji) {
                await itx.reply({
                  ephemeral: true,
                  content: "Please provide only one emoji",
                });
                return;
              }

              const after = parseDate(rawAfter, "start", () => new Date(0));
              const before = parseDate(rawBefore, "end", () => new Date());

              const where = and(
                eq(emojiUsage.emojiId, emoji.id),
                between(emojiUsage.timestamp, after, before),
              );

              const paginate = new DatabasePaginator({
                orderBy: [count(), emojiUsage.userId],
                select: db
                  .select({ userId: emojiUsage.userId, count: count() })
                  .from(emojiUsage)
                  .where(where)
                  .groupBy(emojiUsage.userId)
                  .$dynamic(),
                count: db
                  .select({ count: countDistinct(emojiUsage.userId) })
                  .from(emojiUsage)
                  .where(where)
                  .$dynamic(),
              });

              const paginator = new PaginatedView(
                paginate,
                `Emoji stats for ${emoji.name}`,
                (item, idx) => `${idx}. <@${item.userId}> - ${item.count}`,
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
          .handle(async ({ db }, { after: rawAfter, before: rawBefore }, itx) => {
            if (!itx.inCachedGuild()) return;

            const after = parseDate(rawAfter, "start", () => new Date(0));
            const before = parseDate(rawBefore, "end", () => new Date());
            const where = and(
              eq(emojiUsage.guildId, itx.guild.id),
              between(emojiUsage.timestamp, after, before),
            );

            const paginate = new DatabasePaginator({
              orderBy: [count(), emojiUsage.emojiId],
              select: db
                .select({ emojiId: emojiUsage.emojiId, count: count() })
                .from(emojiUsage)
                .where(where)
                .groupBy(emojiUsage.emojiId)
                .$dynamic(),
              count: db
                .select({ count: countDistinct(emojiUsage.emojiId) })
                .from(emojiUsage)
                .where(where)
                .$dynamic(),
            });

            const paginator = new PaginatedView(
              paginate,
              "Guild emoji stats",
              async (item, idx) => {
                const emoji = await discordTry(
                  () => itx.guild.emojis.fetch(item.emojiId),
                  [RESTJSONErrorCodes.UnknownEmoji],
                  () => "unknown emoji",
                );

                return `${idx}. ${emoji} - ${item.count}`;
              },
              true,
            );

            await paginator.render(itx);
          }),
      )
      .addCommand("prune", (command) =>
        command
          .setDescription("Prune removed emojis from the database")
          .handle(async ({ db }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            if (
              !itx.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)
            ) {
              await itx.reply({
                ephemeral: true,
                content: "You do not have the required permissions to run this command",
              });
              return;
            }

            const guildEmojis = itx.guild.emojis.cache;
            const emojiIds = guildEmojis.map((emoji) => emoji.id);

            db.delete(emojiUsage).where(
              and(
                eq(emojiUsage.guildId, itx.guild.id),
                notInArray(emojiUsage.emojiId, emojiIds),
              ),
            );

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
          .handle(async ({ db }, { after: rawAfter, before: rawBefore }, itx) => {
            if (!itx.inCachedGuild()) return;

            const after = parseDate(rawAfter, "start", () => new Date(0));
            const before = parseDate(rawBefore, "end", () => new Date());

            const guildEmojis = await itx.guild.emojis.fetch();

            const emojiUsages = await db
              .selectDistinct({ emojiId: emojiUsage.emojiId })
              .from(emojiUsage)
              .where(
                and(
                  eq(emojiUsage.guildId, itx.guild.id),
                  between(emojiUsage.timestamp, after, before),
                ),
              )
              .orderBy(emojiUsage.emojiId);

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
