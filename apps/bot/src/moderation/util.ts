import type { ExtractContext } from "@hashira/core";
import { schema } from "@hashira/db";
import { eq } from "@hashira/db/drizzle";
import { formatDate } from "date-fns";
import {
  type GuildMember,
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

export const formatUserWithId = (user: User) =>
  `${bold(user.tag)} (${inlineCode(user.id)})`;

export const getMuteRoleId = async (db: BaseContext["db"], guildId: string) => {
  const settings = await db.query.guildSettings.findFirst({
    where: eq(schema.guildSettings.guildId, guildId),
  });
  if (!settings) return null;
  return settings.muteRoleId;
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

export const formatBanReason = (
  reason: string,
  moderator: User,
  createdAt: Date,
) => `${reason} (banujący: ${moderator.tag} (${moderator.id}), \
data: ${formatDate(createdAt, "yyyy-MM-dd HH:mm:ss")})`;

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
