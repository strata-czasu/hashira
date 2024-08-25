import { type ExtractContext, Hashira, PaginatedView } from "@hashira/core";
import {
  DatabasePaginator,
  type ExtendedPrismaClient,
  type Mute,
  type PrismaTransaction,
  schema,
} from "@hashira/db";
import { and, count, eq, gte, isNull } from "@hashira/db/drizzle";
import { PaginatorOrder } from "@hashira/paginate";
import { add, intervalToDuration } from "date-fns";
import {
  ActionRowBuilder,
  HeadingLevel,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  type RepliableInteraction,
  TextInputBuilder,
  TextInputStyle,
  TimestampStyles,
  type User,
  bold,
  channelMention,
  heading,
  inlineCode,
  italic,
  strikethrough,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { durationToSeconds, formatDuration, parseDuration } from "../util/duration";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { applyMute, formatUserWithId, getMuteRoleId } from "./util";

type Context = ExtractContext<typeof base>;

const formatMuteLength = (mute: typeof schema.Mute.$inferSelect) => {
  const { createdAt, endsAt } = mute;
  const duration = intervalToDuration({ start: createdAt, end: endsAt });
  const durationParts = [];
  if (duration.days) durationParts.push(`${duration.days}d`);
  if (duration.hours) durationParts.push(`${duration.hours}h`);
  if (duration.minutes) durationParts.push(`${duration.minutes}m`);
  if (duration.seconds) durationParts.push(`${duration.seconds}s`);
  if (durationParts.length === 0) return "0s";
  return durationParts.join(" ");
};

export const createFormatMuteInList =
  ({ includeUser }: { includeUser: boolean }) =>
  (mute: Mute, _idx: number) => {
    const { id, createdAt, deletedAt, reason, moderatorId, deleteReason, userId } =
      mute;

    const mutedUserMention = includeUser ? `${userMention(userId)} ` : "";

    const header = heading(
      `${mutedUserMention}${userMention(moderatorId)} ${time(
        createdAt,
        TimestampStyles.ShortDateTime,
      )} [${id}]`,
      HeadingLevel.Three,
    );

    const lines = [
      deletedAt ? strikethrough(header) : header,
      `${bold("Czas trwania")}: ${formatMuteLength(mute)}`,
      `${bold("Powód")}: ${italic(reason)}`,
    ];

    if (deletedAt) {
      lines.push(
        `${bold("Data usunięcia")}: ${time(deletedAt, TimestampStyles.ShortDateTime)}`,
      );
    }
    if (deleteReason) {
      lines.push(`${bold("Powód usunięcia")}: ${italic(deleteReason)}`);
    }

    return lines.join("\n");
  };

const getUserMutesPaginatedView = (
  prisma: ExtendedPrismaClient,
  user: User,
  guildId: string,
  deleted: boolean | null,
) => {
  const muteWheres = and(
    eq(schema.Mute.guildId, guildId),
    eq(schema.Mute.userId, user.id),
    deleted ? undefined : isNull(schema.Mute.deletedAt),
  );
  const paginate = new DatabasePaginator({
    orderBy: schema.Mute.createdAt,
    ordering: PaginatorOrder.DESC,
    pageSize: 5,
    select: prisma.$drizzle.select().from(schema.Mute).where(muteWheres).$dynamic(),
    count: prisma.$drizzle
      .select({ count: count() })
      .from(schema.Mute)
      .where(muteWheres)
      .$dynamic(),
  });

  const formatMuteInList = createFormatMuteInList({ includeUser: false });

  return new PaginatedView(
    paginate,
    `Wyciszenia ${user.tag}`,
    formatMuteInList,
    true,
    `ID: ${user.id}`,
  );
};

const getMute = (tx: PrismaTransaction, id: number, guildId: string) =>
  tx.mute.findFirst({ where: { guildId, id, deletedAt: null } });

const RULES_CHANNEL = "873167662082056232";
const APPEALS_CHANNEL = "1213901611836117052";

const addMute = async ({
  prisma,
  messageQueue,
  itx,
  user,
  duration: rawDuration,
  reason,
}: {
  prisma: ExtendedPrismaClient;
  messageQueue: Context["messageQueue"];
  itx: RepliableInteraction<"cached">;
  user: User;
  duration: string;
  reason: string;
}) => {
  const member = await discordTry(
    async () => itx.guild.members.fetch(user),
    [RESTJSONErrorCodes.UnknownMember],
    async () => {
      await errorFollowUp(itx, "Nie znaleziono podanego użytkownika na tym serwerze.");
      return null;
    },
  );
  if (!member) return;

  const activeMute = await prisma.mute.findFirst({
    where: {
      guildId: itx.guildId,
      userId: user.id,
      deletedAt: null,
      endsAt: { gte: itx.createdAt },
    },
  });
  if (activeMute) {
    await errorFollowUp(
      itx,
      `Użytkownik jest już wyciszony do ${time(
        activeMute.endsAt,
        TimestampStyles.RelativeTime,
      )} przez ${userMention(activeMute.moderatorId)}.\nPowód: ${italic(
        activeMute.reason,
      )}`,
    );
    return;
  }

  const muteRoleId = await getMuteRoleId(prisma, itx.guildId);
  if (!muteRoleId) {
    // TODO: Add an actual link to the settings command
    await errorFollowUp(
      itx,
      "Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`",
    );
    return;
  }

  const duration = parseDuration(rawDuration);
  if (!duration) {
    await errorFollowUp(
      itx,
      "Nieprawidłowy format czasu. Przykłady: `1d`, `8h`, `30m`, `1s`",
    );
    return;
  }
  if (durationToSeconds(duration) === 0) {
    await errorFollowUp(itx, "Nie można ustawić czasu trwania wyciszenia na 0");
    return;
  }
  const endsAt = add(itx.createdAt, duration);

  await ensureUsersExist(prisma, [user.id, itx.user.id]);

  // Create mute and try to add the mute role
  // If adding the role fails, rollback the transaction
  const mute = await prisma.$transaction(async (tx) => {
    const mute = await tx.mute.create({
      data: {
        createdAt: itx.createdAt,
        endsAt,
        guildId: itx.guildId,
        moderatorId: itx.user.id,
        reason,
        userId: user.id,
      },
    });

    if (!mute) return null;

    const appliedMute = await applyMute(
      member,
      muteRoleId,
      `Wyciszenie: ${reason} [${mute.id}]`,
    );
    if (!appliedMute) {
      await errorFollowUp(
        itx,
        "Nie można dodać roli wyciszenia lub rozłączyć użytkownika. Sprawdź uprawnienia bota.",
      );

      throw new Error(
        `Failed to apply mute for user ${user.id} at guild ${itx.guildId}`,
      );
    }
    return mute;
  });
  if (!mute) return;

  await messageQueue.push(
    "muteEnd",
    { muteId: mute.id, guildId: itx.guildId, userId: user.id },
    durationToSeconds(duration),
    mute.id.toString(),
  );

  const sentMessage = await sendDirectMessage(
    user,
    `Hejka! Przed chwilą ${userMention(itx.user.id)} (${
      itx.user.tag
    }) nałożył Ci karę wyciszenia (mute). Musiałem więc niestety odebrać Ci prawo do pisania i mówienia na ${bold(
      formatDuration(duration),
    )}. Powodem Twojego wyciszenia jest: ${italic(
      reason,
    )}.\n\nPrzeczytaj ${channelMention(
      RULES_CHANNEL,
    )} i jeżeli nie zgadzasz się z powodem Twojej kary, to odwołaj się od niej klikając czerwony przycisk "Odwołaj się" na kanale ${channelMention(
      APPEALS_CHANNEL,
    )}. W odwołaniu spinguj nick osoby, która nałożyła Ci karę.`,
  );

  await itx.editReply(
    `Dodano wyciszenie [${inlineCode(
      mute.id.toString(),
    )}] dla ${formatUserWithId(user)}.\nPowód: ${italic(
      reason,
    )}\nKoniec: ${time(endsAt, TimestampStyles.RelativeTime)}`,
  );
  if (!sentMessage) {
    await itx.followUp({
      content: `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`,
      ephemeral: true,
    });
  }
};

export const mutes = new Hashira({ name: "mutes" })
  .use(base)
  .group("mute", (group) =>
    group
      .setDescription("Zarządzaj wyciszeniami")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addCommand("add", (command) =>
        command
          .setDescription("Wycisz użytkownika")
          .addUser("user", (user) =>
            user.setDescription("Użytkownik, którego chcesz wyciszyć"),
          )
          .addString("duration", (duration) =>
            duration.setDescription("Czas trwania wyciszenia"),
          )
          .addString("reason", (reason) => reason.setDescription("Powód wyciszenia"))
          .handle(async ({ prisma, messageQueue }, { user, duration, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();
            await addMute({ prisma, messageQueue, itx, user, duration, reason });
          }),
      )
      .addCommand("remove", (command) =>
        command
          .setDescription("Usuń wyciszenie")
          .addInteger("id", (id) => id.setDescription("ID wyciszenia").setMinValue(0))
          .addString("reason", (reason) =>
            reason.setDescription("Powód usunięcia wyciszenia").setRequired(false),
          )
          .handle(async ({ prisma, messageQueue }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const mute = await prisma.$transaction(async (tx) => {
              const mute = await getMute(tx, id, itx.guildId);
              if (!mute) {
                await errorFollowUp(itx, "Nie znaleziono wyciszenia o podanym ID");
                return null;
              }
              // TODO: Save a log of this edit in the database
              await prisma.mute.update({
                where: { id },
                data: { deletedAt: itx.createdAt, deleteReason: reason },
              });

              await messageQueue.updateDelay("muteEnd", mute.id.toString(), 0);

              return mute;
            });
            if (!mute) return;

            if (reason) {
              await itx.editReply(
                `Usunięto wyciszenie ${inlineCode(
                  id.toString(),
                )}. Powód usunięcia: ${italic(reason)}`,
              );
            } else {
              itx.editReply(`Usunięto wyciszenie ${inlineCode(id.toString())}`);
            }
          }),
      )
      .addCommand("edit", (command) =>
        command
          .setDescription("Edytuj wyciszenie")
          .addInteger("id", (id) => id.setDescription("ID wyciszenia").setMinValue(0))
          .addString("reason", (reason) =>
            reason.setDescription("Nowy powód wyciszenia").setRequired(false),
          )
          .addString("duration", (duration) =>
            duration.setDescription("Nowy czas trwania wyciszenia").setRequired(false),
          )
          .handle(
            async (
              { prisma, messageQueue },
              { id, reason, duration: rawDuration },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              if (!reason && !rawDuration) {
                await errorFollowUp(
                  itx,
                  "Podaj nowy powód lub czas trwania wyciszenia",
                );
                return;
              }

              const mute = await prisma.$transaction(async (tx) => {
                const mute = await getMute(tx, id, itx.guildId);
                if (!mute) {
                  await errorFollowUp(itx, "Nie znaleziono wyciszenia o podanym ID");
                  return null;
                }
                const originalReason = mute.reason;
                const originalDuration = intervalToDuration({
                  start: mute.createdAt,
                  end: mute.endsAt,
                });

                // null - parsing failed, undefined - no duration provided
                const duration = rawDuration ? parseDuration(rawDuration) : undefined;
                if (duration === null) {
                  await errorFollowUp(
                    itx,
                    "Nieprawidłowy format czasu. Przykłady: `1d`, `8h`, `30m`, `1s`",
                  );
                  return null;
                }

                if (duration && durationToSeconds(duration) === 0) {
                  await errorFollowUp(
                    itx,
                    "Nie można ustawić czasu trwania wyciszenia na 0",
                  );
                  return null;
                }

                const updates: Partial<Mute> = {};
                if (reason) updates.reason = reason;
                if (duration) updates.endsAt = add(mute.createdAt, duration);

                // TODO: Save a log of this edit in the database
                const updatedMute = await prisma.mute.update({
                  where: { id },
                  data: updates,
                });

                if (!updatedMute) return null;

                if (duration) {
                  await messageQueue.updateDelay(
                    "muteEnd",
                    updatedMute.id.toString(),
                    durationToSeconds(duration),
                  );
                }

                await discordTry(
                  async () => {
                    const member = await itx.guild.members.fetch(mute.userId);
                    let content = `Twoje wyciszenie zostało zedytowane przez ${userMention(
                      itx.user.id,
                    )} (${itx.user.tag}).`;
                    if (reason) {
                      content += `\n\nPoprzedni powód wyciszenia: ${italic(
                        originalReason,
                      )}\nNowy powód wyciszenia: ${italic(reason)}`;
                    }
                    if (duration) {
                      content += `\n\nPoprzednia długość kary: ${bold(
                        formatDuration(originalDuration),
                      )}\nNowa długość kary: ${bold(formatDuration(duration))}`;
                    }
                    await sendDirectMessage(member.user, content);
                  },
                  [RESTJSONErrorCodes.UnknownMember],
                  async () => {},
                );

                return updatedMute;
              });
              if (!mute) return;

              await itx.editReply(
                `Zaktualizowano wyciszenie ${inlineCode(id.toString())}. `
                  .concat(reason ? `\nNowy powód: ${italic(reason)}` : "")
                  .concat(
                    rawDuration
                      ? `\nKoniec: ${time(mute.endsAt, TimestampStyles.RelativeTime)}`
                      : "",
                  ),
              );
            },
          ),
      ),
  )
  .group("mutes", (group) =>
    group
      .setDescription("Sprawdzaj aktywne wyciszenia i historię wyciszeń")
      .setDMPermission(false)
      .addCommand("list", (command) =>
        command
          .setDescription("Wyświetl wszystkie aktywne wyciszenia")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const muteWheres = and(
              eq(schema.Mute.guildId, itx.guildId),
              isNull(schema.Mute.deletedAt),
              gte(schema.Mute.endsAt, itx.createdAt),
            );
            const paginate = new DatabasePaginator({
              orderBy: schema.Mute.createdAt,
              ordering: PaginatorOrder.DESC,
              pageSize: 5,
              select: prisma.$drizzle
                .select({
                  id: schema.Mute.id,
                  createdAt: schema.Mute.createdAt,
                  reason: schema.Mute.reason,
                  userId: schema.Mute.userId,
                  moderatorId: schema.Mute.moderatorId,
                  endsAt: schema.Mute.endsAt,
                })
                .from(schema.Mute)
                .where(muteWheres)
                .$dynamic(),
              count: prisma.$drizzle
                .select({ count: count() })
                .from(schema.Mute)
                .where(muteWheres)
                .$dynamic(),
            });

            const paginatedView = new PaginatedView(
              paginate,
              "Aktywne wyciszenia",
              (mute) => {
                const lines = [
                  heading(
                    `${userMention(mute.userId)} ${time(mute.createdAt, TimestampStyles.ShortDateTime)} [${mute.id}]`,
                    HeadingLevel.Three,
                  ),
                  `${bold("Moderator")}: ${userMention(mute.moderatorId)}`,
                  `${bold("Koniec")}: ${time(mute.endsAt, TimestampStyles.RelativeTime)}`,
                  `${bold("Powód")}: ${italic(mute.reason)}`,
                ];

                return lines.join("\n");
              },
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("user", (command) =>
        command
          .setDescription("Wyświetl wyciszenia użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addBoolean("deleted", (deleted) =>
            deleted.setDescription("Pokaż usunięte wyciszenia").setRequired(false),
          )
          .handle(async ({ prisma }, { user: selectedUser, deleted }, itx) => {
            if (!itx.inCachedGuild()) return;

            const user = selectedUser ?? itx.user;
            const paginatedView = getUserMutesPaginatedView(
              prisma,
              user,
              itx.guildId,
              deleted,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("me", (command) =>
        command
          .setDescription("Wyświetl swoje wyciszenia")
          .addBoolean("deleted", (deleted) =>
            deleted.setDescription("Pokaż usunięte wyciszenia").setRequired(false),
          )
          .handle(async ({ prisma }, { deleted }, itx) => {
            if (!itx.inCachedGuild()) return;

            const paginatedView = getUserMutesPaginatedView(
              prisma,
              itx.user,
              itx.guildId,
              deleted,
            );
            await paginatedView.render(itx);
          }),
      ),
  )
  .handle("guildMemberAdd", async ({ prisma }, member) => {
    const activeMute = await prisma.mute.findFirst({
      where: {
        guildId: member.guild.id,
        userId: member.id,
        deletedAt: null,
        endsAt: { gte: new Date() },
      },
    });

    if (!activeMute) return;

    const muteRoleId = await getMuteRoleId(prisma, member.guild.id);
    if (!muteRoleId) return;
    await member.roles.add(muteRoleId, `Przywrócone wyciszenie [${activeMute.id}]`);
  })
  .userContextMenu(
    "mute",
    PermissionFlagsBits.ModerateMembers,
    async ({ prisma, messageQueue }, itx) => {
      if (!itx.inCachedGuild()) return;

      const rows = [
        new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId("duration")
            .setLabel("Czas trwania wyciszenia")
            .setRequired(true)
            .setPlaceholder("3h, 8h, 1d")
            .setMinLength(2)
            .setStyle(TextInputStyle.Short),
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Powód")
            .setRequired(true)
            .setPlaceholder("Toxic")
            .setMaxLength(500)
            .setStyle(TextInputStyle.Paragraph),
        ),
      ];
      const modal = new ModalBuilder()
        .setCustomId(`mute-${itx.targetUser.id}`)
        .setTitle(`Wycisz ${itx.targetUser.tag}`)
        .addComponents(...rows);
      await itx.showModal(modal);

      const submitAction = await itx.awaitModalSubmit({ time: 60_000 * 5 });
      await submitAction.deferReply();

      // TODO)) Abstract this into a helper/common util
      const duration = submitAction.components
        .at(0)
        ?.components.find((c) => c.customId === "duration")?.value;
      const reason = submitAction.components
        .at(1)
        ?.components.find((c) => c.customId === "reason")?.value;
      if (!duration || !reason) {
        return await errorFollowUp(
          submitAction,
          "Nie podano wszystkich wymaganych danych!",
        );
      }

      await addMute({
        prisma,
        messageQueue,
        itx: submitAction,
        user: itx.targetUser,
        duration,
        reason,
      });
    },
  );
