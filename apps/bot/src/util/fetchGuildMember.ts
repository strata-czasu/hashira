import { type Client, type GuildMember, RESTJSONErrorCodes } from "discord.js";
import { discordTry } from "./discordTry";

export const fetchGuildMember = async (
  client: Client,
  guildId: string,
  userId: string,
): Promise<GuildMember | null> => {
  const guild = await discordTry(
    async () => client.guilds.fetch(guildId),
    [RESTJSONErrorCodes.UnknownGuild],
    async () => null,
  );
  if (!guild) return null;

  return discordTry(
    async () => guild.members.fetch(userId),
    [RESTJSONErrorCodes.UnknownMember],
    async () => null,
  );
};
