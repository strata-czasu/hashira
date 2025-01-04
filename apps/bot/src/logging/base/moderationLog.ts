import { Hashira } from "@hashira/core";
import type { Mute, Warn } from "@hashira/db";
import { type Duration, formatDuration } from "date-fns";
import {
  type GuildBan,
  TimestampStyles,
  type User,
  bold,
  inlineCode,
  italic,
  time,
  userMention,
} from "discord.js";
import { formatMuteLength } from "../../moderation/util";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

type WarnCreateData = { warn: Warn; moderator: User };
type WarnRemoveData = { warn: Warn; moderator: User; removeReason: string | null };
type WarnEditData = {
  warn: Warn;
  moderator: User;
  oldReason: string;
  newReason: string;
};
type MuteCreateData = { mute: Mute; moderator: User };
type MuteRemoveData = { mute: Mute; moderator: User; removeReason: string | null };
type MuteEditData = {
  mute: Mute;
  moderator: User;
  oldReason: string;
  newReason: string | null;
  oldDuration: Duration;
  newDuration: Duration | null;
};
type GuildBanAddData = { reason: string | null; user: User; moderator: User | null };
type GuildBanRemoveData = { ban: GuildBan };

const getWarnLogHeader = (action: string, warn: Warn) =>
  `**${action} ostrzeżenie [${inlineCode(warn.id.toString())}] dla ${userMention(warn.userId)} (${warn.userId})**`;

const getMuteLogHeader = (action: string, mute: Mute) =>
  `**${action} wyciszenie [${inlineCode(mute.id.toString())}] dla ${userMention(mute.userId)} (${mute.userId})**`;

export const moderationLog = new Hashira({ name: "moderationLog" }).const(
  "moderationLog",
  new Logger()
    .addMessageType(
      "warnCreate",
      async ({ timestamp }, { warn, moderator }: WarnCreateData) => {
        return getLogMessageEmbed(moderator, timestamp)
          .setDescription(
            `${getWarnLogHeader("Nadaje", warn)}\nPowód: ${italic(warn.reason)}`,
          )
          .setColor("Green");
      },
    )
    .addMessageType(
      "warnRemove",
      async ({ timestamp }, { warn, moderator, removeReason }: WarnRemoveData) => {
        let content = `${getWarnLogHeader("Usuwa", warn)}\nPowód warna: ${italic(warn.reason)}`;
        if (removeReason) content += `\nPowód usunięcia: ${italic(removeReason)}`;
        return getLogMessageEmbed(moderator, timestamp)
          .setDescription(content)
          .setColor("Red");
      },
    )
    .addMessageType(
      "warnEdit",
      async (
        { timestamp },
        { warn, moderator, oldReason, newReason }: WarnEditData,
      ) => {
        return getLogMessageEmbed(moderator, timestamp)
          .setDescription(
            `${getWarnLogHeader("Edytuje", warn)}\nStary powód: ${italic(oldReason)}\nNowy powód: ${italic(newReason)}`,
          )
          .setColor("Yellow");
      },
    )
    .addMessageType(
      "muteCreate",
      async ({ timestamp }, { mute, moderator }: MuteCreateData) => {
        return getLogMessageEmbed(moderator, timestamp)
          .setDescription(
            `${getMuteLogHeader("Nadaje", mute)}\nCzas trwania: ${formatMuteLength(mute)}\nKoniec: ${time(mute.endsAt, TimestampStyles.RelativeTime)}\nPowód: ${italic(mute.reason)}`,
          )
          .setColor("Green");
      },
    )
    .addMessageType(
      "muteRemove",
      async ({ timestamp }, { mute, moderator, removeReason }: MuteRemoveData) => {
        let content = `${getMuteLogHeader("Usuwa", mute)}\nPowód mute: ${italic(mute.reason)}`;
        if (removeReason) content += `\nPowód usunięcia: ${italic(removeReason)}`;
        return getLogMessageEmbed(moderator, timestamp)
          .setDescription(content)
          .setColor("Yellow");
      },
    )
    .addMessageType(
      "muteEdit",
      async (
        { timestamp },
        {
          mute,
          moderator,
          oldReason,
          newReason,
          oldDuration,
          newDuration,
        }: MuteEditData,
      ) => {
        let content = getMuteLogHeader("Edytuje", mute);
        if (newReason)
          content += `\nStary powód: ${italic(oldReason)}\nNowy powód: ${italic(newReason)}`;
        if (newDuration)
          content += `\nStary czas trwania: ${formatDuration(oldDuration)}\nNowy czas trwania: ${formatDuration(newDuration)}`;
        return getLogMessageEmbed(moderator, timestamp)
          .setDescription(content)
          .setColor("Yellow");
      },
    )
    .addMessageType(
      "guildBanAdd",
      async ({ timestamp }, { reason, user, moderator }: GuildBanAddData) => {
        const content: string[] = [bold("Otrzymuje bana")];

        if (reason) content.push(`Powód: ${italic(reason)}`);

        const moderatorMentionString = moderator
          ? userMention(moderator.id)
          : "Nieznany";

        content.push(`Moderator: ${moderatorMentionString}`);

        const embed = getLogMessageEmbed(user, timestamp)
          .setDescription(content.join("\n"))
          .setColor("Red");
        return embed;
      },
    )
    // TODO)) Add moderator, remove reason and reason when using /unban
    //        This info is missing when receiving the ban event from Discord
    .addMessageType(
      "guildBanRemove",
      async ({ timestamp }, { ban }: GuildBanRemoveData) => {
        let content = "**Zdjęto bana**";
        if (ban.reason) content += `\nPowód: ${italic(ban.reason)}`;
        const embed = getLogMessageEmbed(ban.user, timestamp)
          .setDescription(content)
          .setColor("Green");
        return embed;
      },
    ),
);
