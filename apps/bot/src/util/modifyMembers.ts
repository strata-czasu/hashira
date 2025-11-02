import { type Collection, type GuildMember, RESTJSONErrorCodes } from "discord.js";
import { discordTry } from "./discordTry";

/**
 * Modify guild members and return status of each operation
 * @param members The members to modify
 * @param fn The function to apply to each member
 * @returns An array of booleans indicating whether the operation was successful
 */
export const modifyMembers = async (
  members: Collection<string, GuildMember>,
  fn: (m: GuildMember) => Promise<unknown>,
  shouldSkip?: (m: GuildMember) => boolean,
) => {
  return Promise.all(
    members.map(async (m) =>
      discordTry(
        async () => {
          if (shouldSkip?.(m)) return true;
          await fn(m);
          return true;
        },
        [RESTJSONErrorCodes.MissingPermissions],
        async () => false,
      ),
    ),
  );
};
