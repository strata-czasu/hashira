import { type GuildMember, Team, User } from "discord.js";

export const isOwner = async (user: User | GuildMember): Promise<boolean> => {
  const application = await user.client.application.fetch();

  if (application.owner instanceof User) {
    return application.owner.id === user.id;
  }

  if (application.owner instanceof Team) {
    return application.owner.members.has(user.id);
  }

  return false;
};
