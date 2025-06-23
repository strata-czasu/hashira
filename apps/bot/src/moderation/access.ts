import { Hashira, PaginatedView } from "@hashira/core";
import { type ChannelRestriction, DatabasePaginator } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import { type Duration, add } from "date-fns";
import {
  ChannelType,
  HeadingLevel,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  bold,
  channelMention,
  heading,
  italic,
  strikethrough,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { durationToSeconds, parseDuration } from "../util/duration";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";

const createRestrictionFormatter =
  ({
    includeUser,
    includeChannel,
  }: { includeUser: boolean; includeChannel: boolean }) =>
  (restriction: ChannelRestriction) => {
    const headerParts: string[] = [];
    if (includeUser) headerParts.push(userMention(restriction.userId));
    if (includeChannel) headerParts.push(channelMention(restriction.channelId));
    headerParts.push(
      `${userMention(restriction.moderatorId)} ${time(restriction.createdAt, TimestampStyles.ShortDateTime)} [${restriction.id}]`,
    );
    const header = heading(headerParts.join(" "), HeadingLevel.Three);

    const lines = [restriction.deletedAt ? strikethrough(header) : header];
    lines.push(`${bold("Powód")}: ${italic(restriction.reason)}`);
    if (restriction.endsAt)
      lines.push(
        `${bold("Koniec")}: ${time(restriction.endsAt, TimestampStyles.RelativeTime)}`,
      );
    if (restriction.deletedAt)
      lines.push(
        `${bold("Data przywrócenia")}: ${time(restriction.deletedAt, TimestampStyles.ShortDateTime)}`,
      );
    if (restriction.deleteReason)
      lines.push(`${bold("Powód przywrócenia")}: ${italic(restriction.deleteReason)}`);
    return lines.join("\n");
  };

export const access = new Hashira({ name: "access" })
  .use(base)
  .group("dostepy", (group) =>
    group
      .setDescription("Zarządzaj dostępem do kanałów")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addCommand("odbierz", (command) =>
        command
          .setDescription("Odbierz dostęp do kanału")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addString("reason", (reason) => reason.setDescription("Powód"))
          .addString("czas", (czas) =>
            czas.setDescription("Czas blokady").setRequired(false),
          )
          .addChannel("channel", (channel) =>
            channel
              .setDescription("Kanał")
              .setRequired(false)
              .setChannelType(ChannelType.GuildText),
          )
          .handle(
            async (
              { prisma, messageQueue, moderationLog: log },
              { user, reason, czas, channel },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const targetChannel = channel ?? itx.channel;
              if (!targetChannel || !targetChannel.isTextBased())
                return errorFollowUp(itx, "Kanał musi być tekstowy");

              const existing = await prisma.channelRestriction.findFirst({
                where: {
                  guildId: itx.guildId,
                  channelId: targetChannel.id,
                  userId: user.id,
                  deletedAt: null,
                },
              });
              if (existing)
                return errorFollowUp(itx, "Użytkownik ma już odebrany dostęp");

              let endsAt: Date | null = null;
              if (czas) {
                const duration = parseDuration(czas);
                if (!duration) return errorFollowUp(itx, "Nieprawidłowy format czasu");
                endsAt = add(itx.createdAt, duration);
              }

              await ensureUsersExist(prisma, [user, itx.user]);

              const restriction = await prisma.channelRestriction.create({
                data: {
                  guildId: itx.guildId,
                  channelId: targetChannel.id,
                  userId: user.id,
                  moderatorId: itx.user.id,
                  reason,
                  endsAt,
                },
              });

              const result = await discordTry(
                () =>
                  targetChannel.permissionOverwrites.edit(
                    user,
                    { ViewChannel: false },
                    { reason },
                  ),
                [RESTJSONErrorCodes.MissingPermissions],
                () => null,
              );
              if (!result) return errorFollowUp(itx, "Brak permisji do edycji kanału");

              if (endsAt)
                await messageQueue.push(
                  "channelRestrictionEnd",
                  { restrictionId: restriction.id },
                  durationToSeconds(parseDuration(czas as string) as Duration),
                  restriction.id.toString(),
                );

              log.push("channelRestrictionCreate", itx.guild, {
                restriction,
                moderator: itx.user,
              });

              let msg = `Odebrano dostęp do ${channelMention(
                targetChannel.id,
              )} użytkownikowi <@${user.id}>.`;
              if (endsAt) msg += ` Koniec: ${time(endsAt, "R")} `;
              await itx.editReply(msg);
            },
          ),
      )
      .addCommand("przywroc", (command) =>
        command
          .setDescription("Przywróć dostęp do kanału")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addString("reason", (reason) =>
            reason.setDescription("Powód przywrócenia").setRequired(false),
          )
          .addChannel("channel", (channel) =>
            channel
              .setDescription("Kanał")
              .setRequired(false)
              .setChannelType(ChannelType.GuildText),
          )
          .handle(
            async (
              { prisma, messageQueue, moderationLog: log },
              { user, reason, channel },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const targetChannel = channel ?? itx.channel;
              if (!targetChannel || !targetChannel.isTextBased())
                return errorFollowUp(itx, "Kanał musi być tekstowy");

              const restriction = await prisma.channelRestriction.findFirst({
                where: {
                  guildId: itx.guildId,
                  channelId: targetChannel.id,
                  userId: user.id,
                  deletedAt: null,
                },
              });
              if (!restriction)
                return errorFollowUp(itx, "Użytkownik nie ma odebranego dostępu");

              await prisma.channelRestriction.update({
                where: { id: restriction.id },
                data: { deletedAt: itx.createdAt, deleteReason: reason },
              });

              await messageQueue.cancel(
                "channelRestrictionEnd",
                restriction.id.toString(),
              );

              const result = await discordTry(
                () =>
                  targetChannel.permissionOverwrites.delete(user, reason ?? undefined),
                [RESTJSONErrorCodes.MissingPermissions],
                () => null,
              );
              if (!result) return errorFollowUp(itx, "Brak permisji do edycji kanału");

              log.push("channelRestrictionRemove", itx.guild, {
                restriction,
                moderator: itx.user,
                removeReason: reason ?? null,
              });

              await itx.editReply(
                `Przywrócono dostęp do ${channelMention(
                  targetChannel.id,
                )} użytkownikowi <@${user.id}>.`,
              );
            },
          ),
      )
      .addCommand("kanal", (command) =>
        command
          .setDescription("Wyświetl odebrane dostępy na kanale")
          .addChannel("channel", (ch) =>
            ch
              .setDescription("Kanał")
              .setRequired(false)
              .setChannelType(ChannelType.GuildText),
          )
          .handle(async ({ prisma }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;
            const targetChannel = channel ?? itx.channel;
            if (!targetChannel || !targetChannel.isTextBased())
              return errorFollowUp(itx, "Kanał musi być tekstowy");

            const where = {
              guildId: itx.guildId,
              channelId: targetChannel.id,
            };

            const paginator = new DatabasePaginator(
              (props, createdAt) =>
                prisma.channelRestriction.findMany({
                  where,
                  ...props,
                  orderBy: { createdAt },
                }),
              () => prisma.channelRestriction.count({ where }),
              { pageSize: 5, defaultOrder: PaginatorOrder.DESC },
            );

            const view = new PaginatedView(
              paginator,
              `Odebrane dostępy na ${channelMention(targetChannel.id)}`,
              createRestrictionFormatter({ includeUser: true, includeChannel: false }),
              true,
            );
            await view.render(itx);
          }),
      )
      .addCommand("user", (command) =>
        command
          .setDescription("Wyświetl odebrane dostępy użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ prisma }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;

            const where = {
              guildId: itx.guildId,
              userId: user.id,
            };

            const paginator = new DatabasePaginator(
              (props, createdAt) =>
                prisma.channelRestriction.findMany({
                  where,
                  ...props,
                  orderBy: { createdAt },
                }),
              () => prisma.channelRestriction.count({ where }),
              { pageSize: 5, defaultOrder: PaginatorOrder.DESC },
            );

            const view = new PaginatedView(
              paginator,
              `Odebrane dostępy użytkownika ${user.tag}`,
              createRestrictionFormatter({ includeUser: false, includeChannel: true }),
              true,
            );
            await view.render(itx);
          }),
      ),
  );
