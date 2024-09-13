import type { ChatInputCommandInteraction } from "discord.js";
import { errorFollowUp } from "./errorFollowUp";

const mentionRegex = /^<@!?(\d{15,20})>$/;
const idRegex = /^\d{15,20}$/;

const getFromIdOrMention = (idOrMention: string) => {
  const match = idOrMention.match(mentionRegex);
  if (match) return match[1] ?? null;
  return idRegex.test(idOrMention) ? idOrMention : null;
};

export const parseUserMentions = (content: string) =>
  content
    .replaceAll("<", " <")
    .split(/\s+/)
    .map(getFromIdOrMention)
    .filter((id): id is string => !!id);

/**
 * Parse a single user mention and fetch the User
 *
 * This is used as a workaround for a bug in Discord that crashes the client when
 * trying to use native User select fields in commands commands
 *
 * @param content User mention string
 * @param itx Interaction to reply to in case of an error
 * @returns User object if found, undefined otherwise
 */
// TODO)) Remove this workaround when Discord fixes the bug
export const parseUserMentionWorkaround = async (
  content: string,
  itx: ChatInputCommandInteraction<"cached">,
) => {
  const [parsedUser, ...restOfUsers] = parseUserMentions(content);
  if (!parsedUser) {
    await errorFollowUp(itx, "Nie podano użytkownika.");
    return;
  }
  if (restOfUsers.length > 0) {
    await errorFollowUp(itx, "Podano za dużo użytkowników. Podaj tylko jednego.");
    return;
  }

  return itx.client.users.fetch(parsedUser);
};
