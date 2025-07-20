import type { RepliableInteraction } from "discord.js";

/**
 * Send an error follow-up message to the user
 *
 * Deletes the original reply if it isn't ephemeral
 * and sends a new ephemeral message
 */
export const errorFollowUp = async (itx: RepliableInteraction, content: string) => {
  if (!itx.deferred && !itx.replied) {
    await itx.reply({ content, flags: "Ephemeral" });
    return;
  }
  if (itx.deferred && itx.ephemeral) {
    await itx.editReply({ content });
    return;
  }
  if (itx.deferred && !itx.ephemeral) {
    await itx.deleteReply();
  }
  await itx.followUp({
    content,
    flags: "Ephemeral",
  });
};
