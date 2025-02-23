import { type ExtractContext, Hashira, PaginatedView } from "@hashira/core";
import {
  DatabasePaginator,
  type ExtendedPrismaClient,
  type PrismaTransaction,
  type Warn,
} from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import {
  ActionRowBuilder,
  DiscordjsErrorCodes,
  type Guild,
  HeadingLevel,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  type ModalSubmitInteraction,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TextInputBuilder,
  TextInputStyle,
  TimestampStyles,
  type User,
  heading,
  inlineCode,
  italic,
  strikethrough,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { isDiscordjsError } from "../util/isDiscordjsError";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { formatUserWithId } from "./util";

type Context = ExtractContext<typeof base>;

const getWarn = async (tx: PrismaTransaction, id: number, guildId: string) =>
  tx.warn.findFirst({ where: { guildId, id, deletedAt: null } });

export const createWarnFormat =
  ({ includeUser }: { includeUser: boolean }) =>
  (warn: Warn, _idx: number) => {
    const { id, createdAt, deletedAt, reason, moderatorId, deleteReason } = warn;

    const warnedUserMention = includeUser ? `${userMention(warn.userId)} ` : "";
    const header = heading(
      `${warnedUserMention}${userMention(moderatorId)} ${time(
        createdAt,
        TimestampStyles.ShortDateTime,
      )} [${id}]`,
      HeadingLevel.Three,
    );

    const lines = [
      deletedAt ? strikethrough(header) : header,
      `Powód: ${italic(reason)}`,
    ];

    if (deletedAt) {
      lines.push(`Data usunięcia: ${time(deletedAt, TimestampStyles.ShortDateTime)}`);
    }

    if (deleteReason) {
      lines.push(`Powód usunięcia: ${italic(deleteReason)}`);
    }

    return lines.join("\n");
  };

const getUserWarnsPaginatedView = (
  prisma: ExtendedPrismaClient,
  user: User,
  guildId: string,
  deleted: boolean | null,
) => {
  const where = {
    guildId,
    userId: user.id,
    ...(deleted ? {} : { deletedAt: null }),
  };

  const paginate = new DatabasePaginator(
    (props, createdAt) =>
      prisma.warn.findMany({ where, ...props, orderBy: { createdAt } }),
    () => prisma.warn.count({ where }),
    { pageSize: 5, defaultOrder: PaginatorOrder.DESC },
  );

  const formatWarn = createWarnFormat({ includeUser: false });

  return new PaginatedView(
    paginate,
    `Ostrzeżenia ${user.tag}`,
    formatWarn,
    true,
    `ID: ${user.id}`,
  );
};

const universalAddWarn = async ({
  prisma,
  log,
  user,
  moderator,
  guild,
  reason,
  reply,
  replyToModerator,
}: {
  prisma: ExtendedPrismaClient;
  log: Context["moderationLog"];
  user: User;
  moderator: User;
  guild: Guild;
  reason: string;
  reply: (content: string) => Promise<unknown>;
  replyToModerator: (content: string) => Promise<unknown>;
}) => {
  await ensureUsersExist(prisma, [user, moderator]);

  const warn = await prisma.warn.create({
    data: {
      guildId: guild.id,
      userId: user.id,
      moderatorId: moderator.id,
      reason,
    },
  });
  log.push("warnCreate", guild, { warn, moderator });

  const sentMessage = await sendDirectMessage(
    user,
    `Hejka! Przed chwilą ${userMention(moderator.id)} (${
      moderator.tag
    }) nałożył Ci karę ostrzeżenia (warn). Powodem Twojego ostrzeżenia jest: ${italic(
      reason,
    )}.\n\nPrzeczytaj powód ostrzeżenia i nie rób więcej tego za co zostałxś ostrzeżony. W innym razie możesz otrzymać karę wyciszenia.`,
  );

  await reply(
    `Dodano ostrzeżenie [${inlineCode(
      warn.id.toString(),
    )}] dla ${formatUserWithId(user)}.\nPowód: ${italic(reason)}`,
  );
  if (!sentMessage) {
    await replyToModerator(
      `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`,
    );
  }
};

export const warns = new Hashira({ name: "warns" })
  .use(base)
  .group("warn", (group) =>
    group
      .setDescription("Zarządzaj ostrzeżeniami")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDMPermission(false)
      .addCommand("add", (command) =>
        command
          .setDescription("Dodaj ostrzeżenie")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addString("reason", (reason) => reason.setDescription("Powód ostrzeżenia"))
          .handle(async ({ prisma, moderationLog: log }, { user, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await universalAddWarn({
              prisma,
              log,
              user,
              moderator: itx.user,
              guild: itx.guild,
              reason,
              reply: (content) => itx.followUp(content),
              replyToModerator: (content) =>
                itx.followUp({ content, flags: "Ephemeral" }),
            });
          }),
      )
      .addCommand("remove", (command) =>
        command
          .setDescription("Usuń ostrzeżenie")
          .addInteger("id", (id) => id.setDescription("ID ostrzeżenia").setMinValue(0))
          .addString("reason", (reason) =>
            reason.setDescription("Powód usunięcia ostrzeżenia").setRequired(false),
          )
          .handle(async ({ prisma, moderationLog: log }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const warn = await prisma.$transaction(async (tx) => {
              const warn = await getWarn(tx, id, itx.guildId);
              if (!warn) {
                await errorFollowUp(itx, "Nie znaleziono ostrzeżenia o podanym ID");
                return null;
              }
              await tx.warn.update({
                where: { id },
                data: { deletedAt: new Date(), deleteReason: reason },
              });
              log.push("warnRemove", itx.guild, {
                warn,
                moderator: itx.user,
                removeReason: reason,
              });

              return warn;
            });
            if (!warn) return;

            if (reason) {
              await itx.editReply(
                `Usunięto ostrzeżenie ${inlineCode(
                  id.toString(),
                )}.\nPowód usunięcia: ${italic(reason)}`,
              );
            } else {
              itx.editReply(`Usunięto ostrzeżenie ${inlineCode(id.toString())}`);
            }
          }),
      )
      .addCommand("edit", (command) =>
        command
          .setDescription("Edytuj ostrzeżenie")
          .addInteger("id", (id) => id.setDescription("ID ostrzeżenia").setMinValue(0))
          .addString("reason", (reason) =>
            reason.setDescription("Nowy powód ostrzeżenia"),
          )
          .handle(async ({ prisma, moderationLog: log }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const warn = await prisma.$transaction(async (tx) => {
              const warn = await getWarn(tx, id, itx.guildId);
              if (!warn) {
                await errorFollowUp(itx, "Nie znaleziono ostrzeżenia o podanym ID");
                return null;
              }
              const originalReason = warn.reason;
              await tx.warn.update({
                where: { id },
                data: { reason },
              });
              log.push("warnEdit", itx.guild, {
                warn,
                moderator: itx.user,
                oldReason: originalReason,
                newReason: reason,
              });

              await discordTry(
                async () => {
                  const member = await itx.guild.members.fetch(warn.userId);
                  await sendDirectMessage(
                    member.user,
                    `Twoje ostrzeżenie zostało zedytowane przez ${userMention(
                      itx.user.id,
                    )} (${itx.user.tag}).\n\nPoprzedni powód ostrzeżenia: ${italic(
                      originalReason,
                    )}\nNowy powód ostrzeżenia: ${italic(reason)}`,
                  );
                },
                [RESTJSONErrorCodes.UnknownMember],
                async () => {},
              );

              return warn;
            });
            if (!warn) return;

            await itx.editReply(
              `Zaktualizowano ostrzeżenie ${inlineCode(
                id.toString(),
              )}. Nowy powód: ${italic(reason)}`,
            );
          }),
      ),
  )
  .group("warns", (group) =>
    group
      .setDescription("Wyświetl ostrzeżenia")
      .setDMPermission(false)
      .addCommand("user", (command) =>
        command
          .setDescription("Wyświetl ostrzeżenia użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addBoolean("deleted", (deleted) =>
            deleted.setDescription("Pokaż usunięte ostrzeżenia").setRequired(false),
          )
          .handle(async ({ prisma }, { user, deleted }, itx) => {
            if (!itx.inCachedGuild()) return;

            const paginatedView = getUserWarnsPaginatedView(
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
          .setDescription("Wyświetl swoje ostrzeżenia")
          .addBoolean("deleted", (deleted) =>
            deleted.setDescription("Pokaż usunięte ostrzeżenia").setRequired(false),
          )
          .handle(async ({ prisma }, { deleted }, itx) => {
            if (!itx.inCachedGuild()) return;

            const paginatedView = getUserWarnsPaginatedView(
              prisma,
              itx.user,
              itx.guildId,
              deleted,
            );
            await paginatedView.render(itx);
          }),
      ),
  )
  .userContextMenu(
    "warn",
    PermissionFlagsBits.ModerateMembers,
    async ({ prisma, moderationLog: log }, itx) => {
      if (!itx.inCachedGuild()) return;

      const rows = [
        new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Powód")
            .setRequired(true)
            .setPlaceholder("Grzeczniej")
            .setMaxLength(500)
            .setStyle(TextInputStyle.Paragraph),
        ),
      ];

      const customId = `warn-${itx.targetId}`;
      const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(`Ostrzeż ${itx.targetUser.tag}`)
        .addComponents(...rows);
      await itx.showModal(modal);

      let submitAction: ModalSubmitInteraction<"cached">;
      try {
        submitAction = await itx.awaitModalSubmit({
          time: 60_000 * 5,
          filter: (modal) => modal.customId === customId,
        });
      } catch (e) {
        if (isDiscordjsError(e, DiscordjsErrorCodes.InteractionCollectorError)) return;
        throw e;
      }

      // Any reply is needed in order to successfully finish the modal interaction
      await submitAction.deferReply({ flags: "Ephemeral" });
      const moderatorDmChannel = await itx.user.createDM();

      const reason = submitAction.components
        .at(0)
        ?.components.find((c) => c.customId === "reason")?.value;
      if (!reason) {
        await moderatorDmChannel.send(
          "Nie podano wszystkich wymaganych danych do nałożenia ostrzeżenia!",
        );
        return;
      }

      await universalAddWarn({
        prisma,
        log,
        user: itx.targetUser,
        moderator: itx.user,
        guild: itx.guild,
        reason,
        reply: (content) => moderatorDmChannel.send(content),
        replyToModerator: (content) => moderatorDmChannel.send(content),
      });
      await submitAction.deleteReply();
    },
  );
