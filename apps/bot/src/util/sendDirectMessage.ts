import {
  type MessageCreateOptions,
  type PartialTextBasedChannelFields,
  RESTJSONErrorCodes,
} from "discord.js";
import { discordTry } from "./discordTry";

/**
 * Send a DM to a user, handling the case where the user has DMs disabled.
 * @returns Whether the message was sent successfully
 */
export const sendDirectMessage = async (
  user: PartialTextBasedChannelFields<false>,
  message: string | MessageCreateOptions,
) =>
  discordTry(
    async () => {
      await user.send(message);
      return true;
    },
    [RESTJSONErrorCodes.CannotSendMessagesToThisUser],
    async () => false,
  );
