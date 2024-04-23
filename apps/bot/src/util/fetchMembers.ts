import { Collection, type GuildMember, type UserResolvable } from "discord.js";
import { chunk } from "./chunk";

export async function fetchMembers(
  guild: {
    members: {
      fetch: (options: { user: UserResolvable[] }) => Promise<
        Collection<string, GuildMember>
      >;
    };
  },
  users: string[],
): Promise<Collection<string, GuildMember>> {
  const userChunks = chunk(users, 100);
  const members = userChunks.map((chunk) => guild.members.fetch({ user: chunk }));
  const resolvedMembers = await Promise.all(members);

  return new Collection<string, GuildMember>().concat(...resolvedMembers);
}
