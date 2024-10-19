import { type ChatInputCommandInteraction, Team, User } from "discord.js";

export const isOwner = async (
  interaction: ChatInputCommandInteraction,
): Promise<boolean> => {
  const userToMatch = interaction.user;
  const application = await interaction.client.application.fetch();

  if (application.owner instanceof User) {
    return application.owner.id === userToMatch.id;
  }

  if (application.owner instanceof Team) {
    return application.owner.members.has(userToMatch.id);
  }

  return false;
};
