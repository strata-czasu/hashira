import { EmbedBuilder, GuildMember, type User } from "discord.js";

export const getLogMessageEmbed = (author: User | GuildMember, _timestamp: Date) => {
  const user = author instanceof GuildMember ? author.user : author;
  return new EmbedBuilder().setAuthor({
    name: `${user.tag} (${user.id})`,
    iconURL: user.displayAvatarURL(),
  });
};
