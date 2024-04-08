import { ChatInputCommandInteraction, Team, User } from "discord.js";
import { match } from "ts-pattern";

export const isOwner = async (
  interaction: ChatInputCommandInteraction,
): Promise<boolean> => {
  const userToMatch = interaction.user;
  const application = await interaction.client.application.fetch();

  return match(application.owner)
    .when(
      (owner): owner is User => owner instanceof User,
      (user) => user.id === userToMatch.id,
    )
    .when(
      (owner): owner is Team => owner instanceof Team,
      (team) => team.members.has(userToMatch.id),
    )
    .otherwise(() => false);
};
