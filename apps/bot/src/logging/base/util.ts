import { EmbedBuilder, GuildMember, type PartialUser, type User } from "discord.js";

export const getLogMessageEmbed = (
  author: User | PartialUser | GuildMember,
  _timestamp: Date,
) => {
  const user = author instanceof GuildMember ? author.user : author;
  const tag = user.tag ?? "Nieznany";

  return new EmbedBuilder().setAuthor({
    name: `${tag} (${user.id})`,
    iconURL: user.displayAvatarURL(),
  });
};
