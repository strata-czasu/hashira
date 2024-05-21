import type { ExtractContext } from "@hashira/core";
import { schema } from "@hashira/db";
import { eq } from "@hashira/db/drizzle";
import { type User, bold, inlineCode } from "discord.js";
import type { base } from "../base";

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
