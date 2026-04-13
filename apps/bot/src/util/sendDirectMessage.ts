import {
  type MessageCreateOptions,
  type PartialTextBasedChannelFields,
  RESTJSONErrorCodes,
} from "discord.js";
import { discordTry } from "./discordTry";

// HACK: New undocumented error code with message:
//       "Cannot send messages to this user due to having no mutual guilds"
// TODO: Remove once Discord.js adds this error code
export const CannotSendMessagesToThisUserNoMutualGuids = 50278 as RESTJSONErrorCodes;

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
    [
      RESTJSONErrorCodes.CannotSendMessagesToThisUser,
      CannotSendMessagesToThisUserNoMutualGuids,
    ],
    async () => false,
  );
