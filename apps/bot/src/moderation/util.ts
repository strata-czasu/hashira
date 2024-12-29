import type { ExtractContext } from "@hashira/core";
import type { ExtendedPrismaClient, Mute } from "@hashira/db";
import { formatDate, intervalToDuration } from "date-fns";
import {
  GuildMember,
  RESTJSONErrorCodes,
  type User,
  bold,
  hideLinkEmbed,
  inlineCode,
  userMention,
} from "discord.js";
import type { base } from "../base";
import { STRATA_BAN_APPEAL_URL } from "../specializedConstants";
import { discordTry } from "../util/discordTry";
import { durationToSeconds } from "../util/duration";
import { sendDirectMessage } from "../util/sendDirectMessage";

type BaseContext = ExtractContext<typeof base>;

export const formatUserWithId = (user: User | GuildMember) => {
  const tag = user instanceof GuildMember ? user.user.tag : user.tag;
  return `${bold(tag)} (${inlineCode(user.id)})`;
};

export const getMuteRoleId = async (prisma: ExtendedPrismaClient, guildId: string) => {
  const settings = await prisma.guildSettings.findFirst({ where: { guildId } });

  if (!settings) return null;
  return settings.muteRoleId;
};

export const formatMuteLength = (mute: Mute) => {
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

/**
 * Apply a mute to a member.
 *
 * @returns true if the mute was successful, false if the mute failed
 */
export const applyMute = async (
  member: GuildMember,
  muteRoleId: string,
  auditLogMessage: string,
) => {
  return discordTry(
    async () => {
      if (member.voice.channel) {
        await member.voice.disconnect(auditLogMessage);
      }
      await member.roles.add(muteRoleId, auditLogMessage);
      return true;
    },
    [RESTJSONErrorCodes.MissingPermissions],
    () => false,
  );
};

export const removeMute = async (
  member: GuildMember,
  muteRoleId: string,
  auditLogMessage: string,
) => {
  return discordTry(
    async () => {
      await member.roles.remove(muteRoleId, auditLogMessage);
      return true;
    },
    [RESTJSONErrorCodes.MissingPermissions],
    () => false,
  );
};

export const formatBanReason = (
  reason: string,
  moderator: User | null,
  createdAt: Date,
) => {
  const components = [reason];
  if (moderator) components.push(` (banujący: ${moderator.tag} (${moderator.id})`);
  components.push(`, data: ${formatDate(createdAt, "yyyy-MM-dd HH:mm:ss")}`);

  return components.join("");
};

export const scheduleVerificationReminders = async (
  messageQueue: BaseContext["messageQueue"],
  verificationId: number,
) => {
  await messageQueue.push(
    "verificationReminder",
    {
      verificationId: verificationId,
      elapsed: { hours: 24 },
      remaining: { hours: 48 },
    },
    durationToSeconds({ hours: 24 }),
    `${verificationId}-reminder-24h`,
  );
  await messageQueue.push(
    "verificationReminder",
    {
      verificationId: verificationId,
      elapsed: { hours: 48 },
      remaining: { hours: 24 },
    },
    durationToSeconds({ hours: 48 }),
    `${verificationId}-reminder-48h`,
  );
};

export const cancelVerificationReminders = async (
  messageQueue: BaseContext["messageQueue"],
  verificationId: number,
) =>
  await Promise.all([
    messageQueue.cancel("verificationReminder", `${verificationId}-reminder-24h`),
    messageQueue.cancel("verificationReminder", `${verificationId}-reminder-48h`),
  ]);

export const sendVerificationFailedMessage = async (user: User) =>
  sendDirectMessage(
    user,
    `Hej ${userMention(
      user.id,
    )}! Niestety nie zweryfikowałxś swojego wieku w wyznaczonym terminie lub Twoja weryfikacja wieku została odrzucona i dlatego **musiałem zbanować Cię na Stracie Czasu**.\n\nNadal możesz do nas wrócić po ukończeniu 16 lat. Wystarczy, że **zgłosisz się do nas poprzez ten formularz zaraz po 16 urodzinach: ${hideLinkEmbed(
      STRATA_BAN_APPEAL_URL,
    )}**. Mam nadzieję, że jeszcze kiedyś się zobaczymy, pozdrawiam!`,
  );
