import {
  Collection,
  type GuildMember,
  type Snowflake,
  type UserResolvable,
} from "discord.js";
import { chunk, uniq } from "es-toolkit";

// TODO)) The type of guild.members.fetch is very complex, but otherwise we
// TODO)) would need to bind the fetch to members, which is not very handy.
/**
 * Fetches guild members in batches of 100 users at a time.
 *
 * Discord API limits fetching members to 100 users per request. This utility
 * function automatically chunks the user IDs and performs parallel requests
 * to fetch all members efficiently.
 */
export async function fetchMembers(
  guild: {
    members: {
      fetch: (options: {
        user: UserResolvable[];
      }) => Promise<Collection<string, GuildMember>>;
    };
  },
  users: Snowflake[],
): Promise<Collection<string, GuildMember>> {
  const uniqueUsers = uniq(users);
  const members = chunk(uniqueUsers, 100).map((chunk) =>
    guild.members.fetch({ user: chunk }),
  );
  const resolvedMembers = await Promise.all(members);

  return new Collection<string, GuildMember>().concat(...resolvedMembers);
}
