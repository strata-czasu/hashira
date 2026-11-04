import { PermissionFlagsBits } from "discord.js";

import { errorFollowUp } from "../../util/errorFollowUp";
import type { EconomyRewardType } from "../rewardHandout";
import {
  distributeGiveawayEconomyRewards,
  distributeGiveawayMutes,
  getPendingGiveawayRewards,
  type RewardDistributionReply,
} from "../rewardHandout";
import {
  buildRewardMenuContent,
  createRewardMenuRow,
  GIVEAWAY_REWARD_BUTTON_CUSTOM_ID,
} from "../rewardMenu";
import type { GiveawayButtonHandlerOptions } from "../types";

const REWARD_DISTRIBUTION_TYPES: Record<string, readonly EconomyRewardType[]> = {
  currency: ["currency"],
  items: ["item"],
};

/**
 * Handles clicks on the giveaway reward buttons:
 * - `giveaway-reward` opens an ephemeral menu listing the rewards that still
 *   await distribution (split into currency, items and mutes) together with the
 *   matching distribution buttons,
 * - `giveaway-reward-{currency,items,mute}:<id>` run the actual distribution for
 *   the selected reward type.
 */
export const handleGiveawayRewardButton = async ({
  prisma,
  economyLog,
  messageQueue,
  moderationLog,
  itx,
}: GiveawayButtonHandlerOptions): Promise<void> => {
  const hasStaffPermission = itx.memberPermissions.has(PermissionFlagsBits.ModerateMembers);

  // Distribution buttons from the ephemeral menu carry the giveaway id.
  const distributionMatch = itx.customId.match(/^giveaway-reward-(currency|items|mute):(\d+)$/);
  if (distributionMatch) {
    const distributionType = distributionMatch[1];
    const rawGiveawayId = distributionMatch[2];
    if (!distributionType || !rawGiveawayId) return;

    await itx.deferReply({ flags: "Ephemeral" });

    if (!hasStaffPermission) {
      return await errorFollowUp(itx, "Nie masz uprawnień do rozdawania nagród z giveawayu.");
    }

    const giveaway = await prisma.giveaway.findFirst({
      where: { id: Number.parseInt(rawGiveawayId, 10), guildId: itx.guildId },
    });
    if (!giveaway) return await errorFollowUp(itx, "Nie znaleziono giveawaya o takim id.");
    if (giveaway.endAt > itx.createdAt) {
      return await errorFollowUp(
        itx,
        "Ten giveaway jeszcze się nie zakończył, zwycięzcy nie są jeszcze wyznaczeni.",
      );
    }

    // The menu itself stays ephemeral, but the result is published in the
    // giveaway channel so everyone can see that the rewards were handed out.
    const replyPublicly = async (content: RewardDistributionReply) => {
      await itx.editReply("Nagrody zostały rozdane — szczegóły opublikowano na kanale.");
      const channel = await itx.guild.channels.fetch(giveaway.channelId);
      if (!channel?.isSendable()) {
        throw new Error(`Channel ${giveaway.channelId} is not sendable or not found.`);
      }
      await channel.send(content);
    };

    const rewardTypes = REWARD_DISTRIBUTION_TYPES[distributionType];
    if (rewardTypes) {
      await distributeGiveawayEconomyRewards({
        prisma,
        economyLog,
        guild: itx.guild,
        moderator: itx.user,
        giveaway,
        rewardTypes,
        reply: replyPublicly,
      });
    } else {
      await distributeGiveawayMutes({
        prisma,
        messageQueue,
        log: moderationLog,
        guild: itx.guild,
        moderator: itx.user,
        giveaway,
        reply: replyPublicly,
      });
    }
    return;
  }

  if (itx.customId !== GIVEAWAY_REWARD_BUTTON_CUSTOM_ID) return;

  await itx.deferReply({ flags: "Ephemeral" });

  if (!hasStaffPermission) {
    return await errorFollowUp(itx, "Nie masz uprawnień do rozdawania nagród z tego giveawaya.");
  }

  const giveaway = await prisma.giveaway.findFirst({
    where: {
      guildId: itx.message.guildId,
      channelId: itx.message.channelId,
      messageId: itx.message.id,
    },
  });
  if (!giveaway) return await errorFollowUp(itx, "Ten giveaway nie istnieje!");
  if (giveaway.endAt > itx.createdAt) {
    return await errorFollowUp(
      itx,
      "Ten giveaway jeszcze się nie zakończył, zwycięzcy nie są jeszcze wyłonieni.",
    );
  }

  const pending = await getPendingGiveawayRewards(prisma, giveaway.id);
  const menuContent = buildRewardMenuContent(pending);

  const menuRow = createRewardMenuRow({
    canDistributeCurrency: hasStaffPermission,
    canDistributeItems: hasStaffPermission,
    canDistributeMutes: hasStaffPermission,
    hasCurrencyRewards: pending.currency.length > 0,
    hasItemRewards: pending.items.length > 0,
    hasMuteRewards: pending.mutes.length > 0,
    giveawayId: giveaway.id,
  });
  if (!menuRow) {
    await itx.editReply(menuContent);
    return;
  }

  await itx.editReply({
    content: `${menuContent}\n\nWybierz rodzaj nagród do rozdania:`,
    components: [menuRow],
  });
};
