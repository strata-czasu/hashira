import type { ExtractContext } from "@hashira/core";
import { schema } from "@hashira/db";
import { eq } from "@hashira/db/drizzle";
import {
  type GuildMember,
  RESTJSONErrorCodes,
  type User,
  bold,
  inlineCode,
} from "discord.js";
import type { base } from "../base";
import { discordTry } from "../util/discordTry";

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
