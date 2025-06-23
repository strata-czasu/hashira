import { Hashira, PaginatedView } from "@hashira/core";
import { type ChannelRestriction, DatabasePaginator } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import { add } from "date-fns";
import {
  ChannelType,
  HeadingLevel,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  type User,
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
import { sendDirectMessage } from "../util/sendDirectMessage";

const CHANNEL_RESTRICTION_TEMPLATE = `
## Hejka {{user}}!
Przed chwilą {{moderator}} odebrał Ci dostęp do kanału {{channel}}.

**Oto powód odebrania dostępu:**
{{reason}}

{{duration_info}}

Przeczytaj proszę nasze Zasady dostępne pod [tym linkiem](https://discord.com/channels/211261411119202305/873167662082056232/1270484486131290255) i jeżeli nie zgadzasz się z powodem odebrania dostępu, to odwołaj się od niego klikając czerwony przycisk "Odwołaj się" na naszym [kanale od ticketów](https://discord.com/channels/211261411119202305/1213901611836117052/1219338768012804106). W odwołaniu spinguj nick osoby, która odebrała Ci dostęp.

Pozdrawiam,
Biszkopt`;

const CHANNEL_RESTRICTION_RESTORE_TEMPLATE = `
## Hejka {{user}}!
To znowu ja! Przed chwilą przywrócono Ci dostęp do kanału {{channel}}.

{{restore_reason}}

Życzę Ci miłego dnia i jeszcze raz pozdrawiam!

Pozdrawiam,
Biszkopt`;

const composeChannelRestrictionMessage = (
  user: User,
  moderator: User,
  channelId: string,
  reason: string,
  endsAt: Date | null,
) => {
  const durationInfo = endsAt
    ? `Dostęp zostanie automatycznie przywrócony ${time(endsAt, TimestampStyles.RelativeTime)}.`
    : "To odebranie dostępu jest permanentne i może zostać przywrócone tylko ręcznie przez moderację.";

  return CHANNEL_RESTRICTION_TEMPLATE.replace("{{user}}", user.toString())
    .replace("{{moderator}}", `${moderator} (${moderator.tag})`)
    .replace("{{channel}}", channelMention(channelId))
    .replace("{{reason}}", italic(reason))
    .replace("{{duration_info}}", durationInfo);
};

export const composeChannelRestrictionRestoreMessage = (
  user: { toString(): string; id: string },
  channelId: string,
  restoreReason: string | null,
) => {
  const reasonInfo = restoreReason
    ? `**Powód przywrócenia:** ${italic(restoreReason)}`
    : "Dostęp został przywrócony automatycznie po upływie czasu blokady.";

  return CHANNEL_RESTRICTION_RESTORE_TEMPLATE.replace("{{user}}", user.toString())
    .replace("{{channel}}", channelMention(channelId))
    .replace("{{restore_reason}}", reasonInfo);
};

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

    const lines: string[] = [restriction.deletedAt ? strikethrough(header) : header];
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
          .addString("powód", (reason) => reason.setDescription("Powód"))
          .addString("czas", (czas) =>
            czas.setDescription("Czas blokady").setRequired(false),
          )
          .addChannel("kanał", (channel) =>
            channel.setDescription("Kanał").setChannelType(ChannelType.GuildText),
          )
          .handle(
            async (
              { prisma, messageQueue, moderationLog: log },
              { user, powód: reason, czas: rawDuration, kanał: channel },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              if (!channel.isTextBased() || !channel.guild) {
                return errorFollowUp(itx, "Kanał musi być tekstowy");
              }

              const existing = await prisma.channelRestriction.findFirst({
                where: {
                  guildId: itx.guildId,
                  channelId: channel.id,
                  userId: user.id,
                  deletedAt: null,
                },
              });

              if (existing) {
                return errorFollowUp(itx, "Użytkownik ma już odebrany dostęp");
              }

              const duration = rawDuration ? parseDuration(rawDuration) : null;

              if (rawDuration && !duration) {
                return errorFollowUp(itx, "Nieprawidłowy format czasu");
              }

              const endsAt = duration ? add(itx.createdAt, duration) : null;

              await ensureUsersExist(prisma, [user, itx.user]);

              const restriction = await prisma.channelRestriction.create({
                data: {
                  guildId: itx.guildId,
                  channelId: channel.id,
                  userId: user.id,
                  moderatorId: itx.user.id,
                  reason,
                  endsAt,
                },
              });

              const result = await discordTry(
                () =>
                  channel.permissionOverwrites.edit(
                    user,
                    { ViewChannel: false },
                    { reason },
                  ),
                [RESTJSONErrorCodes.MissingPermissions],
                () => null,
              );

              if (!result) {
                return errorFollowUp(itx, "Brak permisji do edycji kanału");
              }

              if (endsAt) {
                await messageQueue.push(
                  "channelRestrictionEnd",
                  { restrictionId: restriction.id },
                  // biome-ignore lint/style/noNonNullAssertion: flow ensures duration is defined and is parseable
                  durationToSeconds(duration!),
                  restriction.id.toString(),
                );
              }

              log.push("channelRestrictionCreate", itx.guild, {
                restriction,
                moderator: itx.user,
              });

              const sentMessage = await sendDirectMessage(
                user,
                composeChannelRestrictionMessage(
                  user,
                  itx.user,
                  channel.id,
                  reason,
                  endsAt,
                ),
              );

              const lines: string[] = [
                `Odebrano dostęp do kanału ${channelMention(channel.id)} dla ${userMention(user.id)}`,
                `**Powód**: ${italic(reason)}`,
              ];

              if (endsAt) {
                lines.push(`**Koniec**: ${time(endsAt, TimestampStyles.RelativeTime)}`);
              }

              if (!sentMessage) {
                lines.push("Nie udało się wysłać wiadomości do użytkownika.");
              }

              await itx.editReply(lines.join("\n"));
            },
          ),
      )
      .addCommand("przywroc", (command) =>
        command
          .setDescription("Przywróć dostęp do kanału")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addString("powód", (reason) =>
            reason.setDescription("Powód przywrócenia").setRequired(false),
          )
          .addChannel("kanał", (channel) =>
            channel
              .setDescription("Kanał")
              .setRequired(false)
              .setChannelType(ChannelType.GuildText),
          )
          .handle(
            async (
              { prisma, messageQueue, moderationLog: log },
              { user, powód: reason, kanał: channel },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              if (!channel || !channel.isTextBased()) {
                return errorFollowUp(itx, "Kanał musi być tekstowy");
              }

              const restriction = await prisma.channelRestriction.findFirst({
                where: {
                  guildId: itx.guildId,
                  channelId: channel.id,
                  userId: user.id,
                  deletedAt: null,
                },
              });

              if (!restriction) {
                return errorFollowUp(itx, "Użytkownik nie ma odebranego dostępu");
              }

              await prisma.channelRestriction.update({
                where: { id: restriction.id },
                data: { deletedAt: itx.createdAt, deleteReason: reason },
              });

              await messageQueue.cancel(
                "channelRestrictionEnd",
                restriction.id.toString(),
              );

              const result = await discordTry(
                () => channel.permissionOverwrites.delete(user, reason ?? undefined),
                [RESTJSONErrorCodes.MissingPermissions],
                () => null,
              );

              if (!result) {
                return errorFollowUp(itx, "Brak permisji do edycji kanału");
              }

              log.push("channelRestrictionRemove", itx.guild, {
                restriction,
                moderator: itx.user,
                removeReason: reason,
              });

              const sentMessage = await sendDirectMessage(
                user,
                composeChannelRestrictionRestoreMessage(user, channel.id, reason),
              );

              const lines: string[] = [
                `Przywrócono dostęp do ${channelMention(channel.id)} dla ${userMention(user.id)}`,
              ];

              if (reason) {
                lines.push(`**Powód przywrócenia**: ${italic(reason)}`);
              }

              if (!sentMessage) {
                lines.push("Nie udało się wysłać wiadomości do użytkownika.");
              }

              await itx.editReply(lines.join("\n"));
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
              { pageSize: 10, defaultOrder: PaginatorOrder.DESC },
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
              { pageSize: 10, defaultOrder: PaginatorOrder.DESC },
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
