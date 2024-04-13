import {
  type Collection,
  DiscordAPIError,
  type GuildMember,
  RESTJSONErrorCodes,
} from "discord.js";

/**
 * Modify guild members and return status of each operation
 * @param members The members to modify
 * @param fn The function to apply to each member
 * @returns An array of booleans indicating whether the operation was successful
 */
export const modifyMembers = async (
  members: Collection<string, GuildMember>,
  fn: (m: GuildMember) => Promise<unknown>,
) => {
  return Promise.all(
    members.map(async (m) => {
      try {
        await fn(m);
        return true;
      } catch (e) {
        if (
          e instanceof DiscordAPIError &&
          e.code === RESTJSONErrorCodes.MissingPermissions
        ) {
          return false;
        }
        throw e;
      }
    }),
  );
};
