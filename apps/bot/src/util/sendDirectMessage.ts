import { DiscordAPIError, RESTJSONErrorCodes, type User } from "discord.js";

/**
 * Send a DM to a user, handling the case where the user has DMs disabled.
 * @returns Whether the message was sent successfully
 */
export const sendDirectMessage = async (user: User, message: string) => {
  try {
    await user.send(message);
    return true;
  } catch (e) {
    if (
      e instanceof DiscordAPIError &&
      e.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser
    ) {
      return false;
    }
    throw e;
  }
};
