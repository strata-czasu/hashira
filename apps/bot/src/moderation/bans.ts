import { type ExtractContext, Hashira } from "@hashira/core";
import {
  ActionRowBuilder,
  AuditLogEvent,
  type ChatInputCommandInteraction,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  type ModalSubmitInteraction,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TextInputBuilder,
  TextInputStyle,
  type User,
  hideLinkEmbed,
  italic,
} from "discord.js";
import { base } from "../base";
import { GUILD_IDS, STRATA_BAN_APPEAL_URL } from "../specializedConstants";
import { discordTry } from "../util/discordTry";
import { durationToSeconds, parseDuration } from "../util/duration";
import { errorFollowUp } from "../util/errorFollowUp";
import { parseUserMentionWorkaround } from "../util/parseUsers";
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
  reason: string,
  deleteMessageSeconds: number | null,
  log: ExtractContext<typeof base>["moderationLog"],
) => {
  const sentMessage = await sendDirectMessage(
    user,
    `Hejka! Przed chwilą nałożyłem Ci karę bana. Powodem Twojego bana jest ${italic(
      reason,
    )}\n\nOd bana możesz odwołać się wypełniając formularz z tego linka: ${hideLinkEmbed(
      STRATA_BAN_APPEAL_URL,
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
      log.push("guildBanAdd", itx.guild, { reason, user, moderator: itx.user });
      await itx.editReply(
        `Zbanowano ${formatUserWithId(user)}.\nPowód: ${italic(reason)}`,
      );
      if (!sentMessage) {
        await itx.followUp({
          content: `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`,
          ephemeral: true,
        });
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

export const bans = new Hashira({ name: "bans" })
  .use(base)
  .command("ban", (command) =>
    command
      .setDescription("Zbanuj użytkownika")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addString("user", (user) => user.setDescription("Użytkownik"))
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
        async (
          { moderationLog: log },
          { user: rawUser, reason, "delete-interval": deleteInterval },
          itx,
        ) => {
          if (!itx.inCachedGuild()) return;
          await itx.deferReply();

          const user = await parseUserMentionWorkaround(rawUser, itx);
          if (!user) return;

          const banDeleteSeconds = deleteInterval
            ? getBanDeleteSeconds(deleteInterval)
            : null;

          await applyBan(itx, user, reason, banDeleteSeconds, log);
        },
      ),
  )
  .command("unban", (command) =>
    command
      .setDescription("Odbanuj użytkownika")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addString("user", (user) => user.setDescription("Użytkownik"))
      .addString("reason", (reason) =>
        reason.setDescription("Powód zdjęcia bana").setRequired(false).setEscaped(true),
      )
      .handle(async (_, { user: rawUser, reason }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const user = await parseUserMentionWorkaround(rawUser, itx);
        if (!user) return;

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
      .addString("user", (user) => user.setDescription("Użytkownik"))
      .handle(async (_, { user: rawUser }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const user = await parseUserMentionWorkaround(rawUser, itx);
        if (!user) return;

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
  .userContextMenu(
    "ban",
    PermissionFlagsBits.BanMembers,
    async ({ moderationLog: log }, itx) => {
      if (!itx.inCachedGuild()) return;

      const rows = [
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
      const modal = new ModalBuilder()
        .setCustomId(`ban-${itx.targetUser.id}`)
        .setTitle(`Zbanuj ${itx.targetUser.tag}`)
        .addComponents(...rows);
      await itx.showModal(modal);

      const submitAction = await itx.awaitModalSubmit({ time: 60_000 * 5 });
      await submitAction.deferReply();

      // TODO)) Abstract this into a helper/common util
      const reason = submitAction.components
        .at(0)
        ?.components.find((c) => c.customId === "reason")?.value;
      const rawDeleteInterval =
        submitAction.components
          .at(1)
          ?.components.find((c) => c.customId === "delete-interval")?.value || null;
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

      await applyBan(submitAction, itx.targetUser, reason, deleteMessageSeconds, log);
    },
  )
  .handle("guildBanAdd", async ({ moderationLog: log }, { guild, user }) => {
    // NOTE: This event could fire multiple times for unknown reasons
    if (!BAN_FIXUP_GUILDS.includes(guild.id)) return;

    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 5,
    });
    const entry = auditLogs.entries.find((entry) => entry.targetId === user.id);
    if (!entry?.executor || !entry?.createdAt || !entry?.reason) return;
    if (entry.executor.bot) return;

    await guild.members.unban(user, "Poprawienie powodu po manualnym zbanowaniu");
    const reason = formatBanReason(
      entry.reason ?? "Brak powodu",
      entry.executor,
      entry.createdAt,
    );
    await guild.members.ban(user, { reason: reason });
    log.push("guildBanAdd", guild, {
      reason: entry.reason,
      user,
      moderator: entry.executor,
    });
  });
