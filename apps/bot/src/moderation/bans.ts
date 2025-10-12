import { Hashira } from "@hashira/core";
import {
  ActionRowBuilder,
  AuditLogEvent,
  type ChatInputCommandInteraction,
  type ContextMenuCommandInteraction,
  DiscordjsErrorCodes,
  hideLinkEmbed,
  italic,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  type ModalSubmitInteraction,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TextInputBuilder,
  TextInputStyle,
  type User,
} from "discord.js";
import { base } from "../base";
import { GUILD_IDS, STRATA_CZASU } from "../specializedConstants";
import { discordTry } from "../util/discordTry";
import { durationToSeconds, parseDuration } from "../util/duration";
import { errorFollowUp } from "../util/errorFollowUp";
import { hasHigherRole } from "../util/hasHigherRole";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { formatBanReason, formatUserWithId } from "./util";

enum BanDeleteInterval {
  None = 0,
  OneHour = 1,
  SixHours = 6,
  TwelveHours = 12,
  OneDay = 24,
  ThreeDays = 24 * 3,
  SevenDays = 24 * 7,
}
const getBanDeleteSeconds = (deleteInterval: number) => {
  return deleteInterval * 3600;
};

const applyBan = async (
  itx: ChatInputCommandInteraction<"cached"> | ModalSubmitInteraction<"cached">,
  user: User,
  moderator: User,
  reason: string,
  deleteMessageSeconds: number | null,
) => {
  const sentMessage = await sendDirectMessage(
    user,
    `Hejka! Przed chwilą nałożyłem Ci karę bana. Powodem Twojego bana jest ${italic(
      reason,
    )}\n\nOd bana możesz odwołać się wypełniając formularz z tego linka: ${hideLinkEmbed(
      STRATA_CZASU.BAN_APPEAL_URL,
    )}.`,
  );
  const banReason = formatBanReason(reason, itx.user, itx.createdAt);

  await discordTry(
    async () => {
      if (!deleteMessageSeconds) {
        await itx.guild.members.ban(user, { reason: banReason });
      } else {
        await itx.guild.members.ban(user, {
          reason: banReason,
          deleteMessageSeconds,
        });
      }
      await itx.editReply(
        `Zbanowano ${formatUserWithId(user)}.\nPowód: ${italic(reason)}`,
      );
      if (!sentMessage) {
        await moderator.send(
          `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`,
        );
      }
    },
    [RESTJSONErrorCodes.MissingPermissions],
    async () => {
      await errorFollowUp(itx, "Nie mam uprawnień do zbanowania tego użytkownika.");
    },
  );
};

const BAN_FIXUP_GUILDS: string[] = [
  GUILD_IDS.Homik,
  GUILD_IDS.Piwnica,
  GUILD_IDS.StrataCzasu,
];

const handleContextMenu = async ({
  itx,
  user,
}: {
  itx: ContextMenuCommandInteraction<"cached">;
  user: User;
}) => {
  const modalRows = [
    new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Powód bana")
        .setRequired(true)
        .setMinLength(2)
        .setStyle(TextInputStyle.Paragraph),
    ),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId("delete-interval")
        .setLabel("Przedział czasowy usuwania wiadomości")
        .setRequired(false)
        .setPlaceholder("1h, 6h, 12h, 1d, 3d, 7d")
        .setMinLength(2)
        .setStyle(TextInputStyle.Short),
    ),
  ];

  const customId = `ban-${user.id}-${itx.commandType}`;
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(`Zbanuj ${user.tag}`)
    .addComponents(...modalRows);
  await itx.showModal(modal);

  const submitAction = await discordTry(
    () =>
      itx.awaitModalSubmit({
        time: 60_000 * 5,
        filter: (modal) => modal.customId === customId,
      }),
    [DiscordjsErrorCodes.InteractionCollectorError],
    () => null,
  );
  if (!submitAction) return;

  await submitAction.deferReply();

  // TODO)) Abstract this into a helper/common util
  const reason = submitAction.fields.getTextInputValue("reason");
  const rawDeleteInterval = submitAction.fields.getTextInputValue("delete-interval");

  if (!reason) {
    return await errorFollowUp(
      submitAction,
      "Nie podano wszystkich wymaganych danych!",
    );
  }

  let deleteMessageSeconds: number | null = null;
  if (rawDeleteInterval) {
    const parsedDuration = parseDuration(rawDeleteInterval);
    if (!parsedDuration) {
      return await errorFollowUp(
        submitAction,
        "Nieprawidłowy format czasu. Przykłady: `1d`, `8h`, `30m`, `1s`",
      );
    }
    deleteMessageSeconds = durationToSeconds(parsedDuration);
  }

  await applyBan(submitAction, user, itx.member.user, reason, deleteMessageSeconds);
};

export const bans = new Hashira({ name: "bans" })
  .use(base)
  .command("ban", (command) =>
    command
      .setDescription("Zbanuj użytkownika")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .addString("reason", (reason) =>
        reason.setDescription("Powód bana").setEscaped(true),
      )
      .addNumber("delete-interval", (deleteInterval) =>
        deleteInterval
          .setDescription("Przedział czasowy usuwania wiadomości")
          .setRequired(false)
          .addChoices(
            { name: "Brak", value: BanDeleteInterval.None },
            { name: "1 godzina", value: BanDeleteInterval.OneHour },
            { name: "6 godzin", value: BanDeleteInterval.SixHours },
            { name: "12 godzin", value: BanDeleteInterval.TwelveHours },
            { name: "1 dzień", value: BanDeleteInterval.OneDay },
            { name: "3 dni", value: BanDeleteInterval.ThreeDays },
            { name: "7 dni", value: BanDeleteInterval.SevenDays },
          ),
      )
      .handle(
        async (_ctx, { user, reason, "delete-interval": deleteInterval }, itx) => {
          if (!itx.inCachedGuild()) return;
          await itx.deferReply();

          const member = itx.guild.members.cache.get(user.id);

          if (member && hasHigherRole(member, itx.member)) {
            return await errorFollowUp(
              itx,
              "Nie możesz zbanować użytkownika z wyższą rolą.",
            );
          }

          const banDeleteSeconds = deleteInterval
            ? getBanDeleteSeconds(deleteInterval)
            : null;

          await applyBan(itx, user, itx.member.user, reason, banDeleteSeconds);
        },
      ),
  )
  .command("unban", (command) =>
    command
      .setDescription("Odbanuj użytkownika")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .addString("reason", (reason) =>
        reason.setDescription("Powód zdjęcia bana").setRequired(false).setEscaped(true),
      )
      .handle(async (_, { user, reason }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await discordTry(
          async () => {
            await itx.guild.members.unban(user, reason ?? undefined);
            const message = reason
              ? `Odbanowano ${formatUserWithId(user)}.\nPowód: ${italic(reason)}`
              : `Odbanowano ${formatUserWithId(user)}`;
            await itx.editReply(message);
          },
          [RESTJSONErrorCodes.UnknownBan],
          async () => {
            await errorFollowUp(
              itx,
              `Użytkownik ${formatUserWithId(user)} nie ma bana.`,
            );
          },
        );
      }),
  )
  .command("checkban", (command) =>
    command
      .setDescription("Sprawdź, czy użytkownik jest zbanowany")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .handle(async (_, { user }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await discordTry(
          async () => {
            const ban = await itx.guild.bans.fetch(user);
            await itx.editReply(
              `${formatUserWithId(user)} ma bana.\nPowód: ${italic(
                ban.reason ?? "Brak",
              )}`,
            );
          },
          [RESTJSONErrorCodes.UnknownBan],
          async () => {
            await itx.editReply(`${formatUserWithId(user)} nie ma bana.`);
          },
        );
      }),
  )
  .userContextMenu("ban", PermissionFlagsBits.BanMembers, async (_ctx, itx) => {
    if (!itx.inCachedGuild()) return;

    await handleContextMenu({
      itx,
      user: itx.targetUser,
    });
  })
  .messageContextMenu("ban", PermissionFlagsBits.BanMembers, async (_ctx, itx) => {
    if (!itx.inCachedGuild()) return;

    await handleContextMenu({
      itx,
      user: itx.targetMessage.author,
    });
  })
  .handle("guildBanAdd", async (_, { guild, user }) => {
    // NOTE: This event could fire multiple times for unknown reasons
    if (!BAN_FIXUP_GUILDS.includes(guild.id)) return;

    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 5,
    });
    const entry = auditLogs.entries.find((entry) => entry.targetId === user.id);
    if (!entry || entry.executor?.bot) return;

    await guild.members.unban(user, "Poprawienie powodu po manualnym zbanowaniu");
    const reason = formatBanReason(
      entry.reason ?? "Brak powodu",
      entry.executor,
      entry.createdAt,
    );

    await guild.members.ban(user, { reason: reason });
  });
