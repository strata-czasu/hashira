import type { CommandInteraction, ModalSubmitInteraction } from "discord.js";

/**
 * Send an error follow-up message to the user
 *
 * Deletes the original reply if it isn't ephemeral
 * and sends a new ephemeral message
 */
export const errorFollowUp = async (
  itx: CommandInteraction | ModalSubmitInteraction,
  content: string,
) => {
  if (!itx.deferred && !itx.replied) {
    await itx.reply({ content, ephemeral: true });
    return;
  }
  if (itx.deferred && !itx.ephemeral) {
    await itx.deleteReply();
  }
  await itx.followUp({
    content,
    ephemeral: true,
  });
};
