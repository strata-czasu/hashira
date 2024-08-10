import { Hashira } from "@hashira/core";
import {
  AuditLogEvent,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  hideLinkEmbed,
  italic,
  userMention,
} from "discord.js";
import { GUILD_IDS, STRATA_BAN_APPEAL_URL } from "../specializedConstants";
import { discordTry } from "../util/discordTry";
import { errorFollowUp } from "../util/errorFollowUp";
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
const getBanDeleteSeconds = (deleteInterval: BanDeleteInterval) => {
  return deleteInterval * 3600;
};

const BAN_FIXUP_GUILDS = [GUILD_IDS.Homik, GUILD_IDS.Piwnica, GUILD_IDS.StrataCzasu];

export const bans = new Hashira({ name: "bans" })
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
      .handle(async (_, { user, reason, "delete-interval": deleteInterval }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const sentMessage = await sendDirectMessage(
          user,
          `Hejka! Przed chwilą ${userMention(itx.user.id)} (${
            itx.user.tag
          }) nałożył Ci karę bana. Powodem Twojego bana jest ${italic(
            reason,
          )}\n\nOd bana możesz odwołać się wypełniając formularz z tego linka: ${hideLinkEmbed(
            STRATA_BAN_APPEAL_URL,
          )}.`,
        );
        const banReason = formatBanReason(reason, itx.user, itx.createdAt);

        await discordTry(
          async () => {
            if (!deleteInterval) {
              await itx.guild.members.ban(user, { reason: banReason });
            } else {
              await itx.guild.members.ban(user, {
                reason: banReason,
                deleteMessageSeconds: getBanDeleteSeconds(deleteInterval),
              });
            }
            await itx.editReply(
              `Zbanowano ${formatUserWithId(user)}.\nPowód: ${italic(reason)}`,
            );
            if (!sentMessage) {
              await itx.followUp({
                content: `Nie udało się wysłać wiadomości do ${formatUserWithId(
                  user,
                )}.`,
                ephemeral: true,
              });
            }
          },
          [RESTJSONErrorCodes.MissingPermissions],
          async () => {
            await errorFollowUp(
              itx,
              "Nie mam uprawnień do zbanowania tego użytkownika.",
            );
          },
        );
      }),
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
  .handle("guildBanAdd", async (_, { guild, user }) => {
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
  });
