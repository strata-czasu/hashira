import { type ButtonInteraction } from "discord.js";

import { render } from "@hashira/jsx";

import { ensureUserExists } from "../../util/ensureUsersExist";
import { waitForButtonClick } from "../../util/singleUseButton";
import type { BaseContext } from "../types";
import { createLeaveButtonRow, updateGiveaway } from "../util";

type JoinHandlerOptions = Pick<BaseContext, "prisma"> & {
  itx: ButtonInteraction<"cached">;
};

/**
 * Handles clicks on the giveaway option buttons attached to a giveaway message:
 * - `giveaway-option:join` — joins the giveaway (with a 1-minute leave window)
 * - `giveaway-option:list` — lists current participants
 * - `leave_giveaway` — leaves the giveaway (on the ephemeral follow-up message)
 */
export const handleGiveawayJoinButton = async ({
  prisma,
  itx,
}: JoinHandlerOptions): Promise<void> => {
  await ensureUserExists(prisma, itx.user);

  await itx.deferReply({ flags: "Ephemeral" });

  const giveaway = await prisma.giveaway.findFirst({
    where: {
      guildId: itx.message.guildId,
      channelId: itx.message.channelId,
      messageId: itx.message.id,
    },
  });
  if (!giveaway) {
    await itx.followUp({
      content: "Ten giveaway nie istnieje!",
      flags: "Ephemeral",
    });
    return;
  }

  const channel = await itx.guild.channels.fetch(giveaway.channelId);
  if (!channel?.isSendable()) {
    throw new Error(`Channel ${giveaway.channelId} is not sendable or not found.`);
  }

  const message = await channel.messages.fetch(giveaway.messageId);
  if (!message) {
    throw new Error(`Message ${giveaway.messageId} not found.`);
  }

  if (giveaway.endAt <= itx.createdAt) {
    await itx.followUp({
      content: "Ten giveaway już się zakończył!",
      flags: "Ephemeral",
    });
    return;
  }

  if (itx.customId.endsWith("list")) {
    const participants = await prisma.giveawayParticipant.findMany({
      where: { giveawayId: giveaway.id, isRemoved: false },
    });

    const fmtParticipants =
      participants.length > 0
        ? participants.map((user) => `<@${user.userId}>`).join(", ")
        : "Brak uczestników";

    await itx.followUp({
      content: `Uczestnicy: ${fmtParticipants}`,
      flags: "Ephemeral",
    });
    return;
  }

  if (!itx.customId.endsWith("join")) {
    await itx.followUp({
      content: `Nieznany przycisk giveawayu ${giveaway.id}: ${itx.customId}`,
      flags: "Ephemeral",
    });
    return;
  }

  let returnMsg = "Już jesteś uczestnikiem tego giveawayu!";

  const existing = await prisma.giveawayParticipant.findFirst({
    where: { userId: itx.user.id, giveawayId: giveaway.id },
  });

  if (existing?.forcefullyRemoved) {
    await itx.followUp({
      content: "Zostałeś usunięty z giveawayu i nie możesz już do niego dołączyć.",
      flags: "Ephemeral",
    });
    return;
  }

  if (!existing || existing.isRemoved) {
    for (const roleId of giveaway.roleWhitelist) {
      if (!itx.member.roles.cache.has(roleId)) {
        await itx.followUp({
          content: `Musisz posiadać rolę <@&${roleId}>, aby wziąć udział w giveawayu.`,
          flags: "Ephemeral",
        });
        return;
      }
    }

    for (const roleId of giveaway.roleBlacklist) {
      if (itx.member.roles.cache.has(roleId)) {
        await itx.followUp({
          content: `Nie możesz posiadać roli <@&${roleId}>, aby wziąć udział w giveawayu.`,
          flags: "Ephemeral",
        });
        return;
      }
    }

    await prisma.giveawayParticipant.upsert({
      where: {
        giveawayId_userId: { giveawayId: giveaway.id, userId: itx.user.id },
      },
      create: { userId: itx.user.id, giveawayId: giveaway.id },
      update: { isRemoved: false },
    });

    returnMsg = `${itx.user} dołączyłxś do giveawayu!`;
    await updateGiveaway(itx.message, giveaway, prisma);
  }

  const joinResponse = await itx.followUp({
    content: returnMsg,
    components: render(createLeaveButtonRow()).components,
  });

  if (!joinResponse) {
    throw new Error("Failed to receive response from interaction reply");
  }

  const leaveButtonClick = await waitForButtonClick(
    joinResponse,
    "leave_giveaway",
    { minutes: 1 },
    (interaction) => interaction.user.id === itx.user.id,
  );

  if (!leaveButtonClick.interaction) return;

  if (giveaway.endAt <= itx.createdAt) {
    await itx.followUp({
      content: "Ten giveaway już się zakończył!",
      flags: "Ephemeral",
    });
    return;
  }

  await leaveButtonClick.interaction.deferReply({ flags: "Ephemeral" });
  await leaveButtonClick.interaction.deleteReply();

  await prisma.giveawayParticipant.update({
    where: {
      giveawayId_userId: { giveawayId: giveaway.id, userId: itx.user.id },
    },
    data: { isRemoved: true },
  });

  await updateGiveaway(itx.message, giveaway, prisma);

  await itx.followUp({ content: "Opuściłxś giveaway.", flags: "Ephemeral" });
};
