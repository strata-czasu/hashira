import type { ChatInputCommandInteraction } from "discord.js";

/**
 * Send an error follow-up message to the user
 *
 * Deletes the original reply and sends a new ephemeral message
 */
export const errorFollowUp = async (
  itx: ChatInputCommandInteraction,
  content: string,
) => {
  await itx.deleteReply();
  await itx.followUp({
    content,
    ephemeral: true,
  });
};
