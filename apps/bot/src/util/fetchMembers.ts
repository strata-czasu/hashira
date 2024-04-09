import { Collection, type GuildMember, type UserResolvable } from "discord.js";

const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

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
