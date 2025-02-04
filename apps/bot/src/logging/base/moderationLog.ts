import { Hashira } from "@hashira/core";
import type { Mute, Warn } from "@hashira/db";
import { type Duration, formatDuration } from "date-fns";
import {
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
type GuildBanRemoveData = { reason: string | null; user: User; moderator: User | null };

const getWarnLogHeader = (action: string, warn: Warn) =>
  `**${action} ostrzeżenie [${inlineCode(warn.id.toString())}] dla ${userMention(warn.userId)} (${warn.userId})**`;

const getMuteLogHeader = (action: string, mute: Mute) =>
  `**${action} wyciszenie [${inlineCode(mute.id.toString())}] dla ${userMention(mute.userId)} (${mute.userId})**`;

const getBanLogContent = (
  title: string,
  reason: string | null,
  moderator: User | null,
) => {
  const content: string[] = [bold(title)];

  if (reason) content.push(`Powód: ${italic(reason)}`);

  const moderatorMentionString = moderator ? userMention(moderator.id) : "Nieznany";
  content.push(`Moderator: ${moderatorMentionString}`);

  return content.join("\n");
};

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
        const content = getBanLogContent("Otrzymuje bana", reason, moderator);
        const embed = getLogMessageEmbed(user, timestamp)
          .setDescription(content)
          .setColor("Red");
        return embed;
      },
    )
    .addMessageType(
      "guildBanRemove",
      async ({ timestamp }, { reason, user, moderator }: GuildBanRemoveData) => {
        const content = getBanLogContent("Otrzymuje unbana", reason, moderator);
        const embed = getLogMessageEmbed(user, timestamp)
          .setDescription(content)
          .setColor("Green");
        return embed;
      },
    ),
);
