import { ComponentType, PermissionFlagsBits } from "discord.js";

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

    const pending = await getPendingGiveawayRewards(prisma, giveaway.id);
    const hasPendingRewards =
      distributionType === "currency"
        ? pending.currency.length > 0
        : distributionType === "items"
          ? pending.items.length > 0
          : pending.mutes.length > 0;

    if (!hasPendingRewards) {
      await itx.editReply("Brak nagród tego typu do rozdania.");
      return;
    }

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

    // When the last rewards of any type were given out, remove the
    // "Rozdaj nagrody" button from the results message in the channel.
    const remaining = await getPendingGiveawayRewards(prisma, giveaway.id);
    const allGiven =
      remaining.currency.length === 0 &&
      remaining.items.length === 0 &&
      remaining.mutes.length === 0;

    if (allGiven) {
      const channel = await itx.guild.channels.fetch(giveaway.channelId);
      if (channel?.isTextBased()) {
        const messages = await channel.messages.fetch({ limit: 50 });
        const resultsMessage = messages.find(
          (m) =>
            m.author.id === itx.client.user?.id && m.reference?.messageId === giveaway.messageId,
        );
        if (resultsMessage) {
          const newComponents = resultsMessage.components.filter((c) => {
            if (c.type !== ComponentType.ActionRow) return true;
            return !c.components.some(
              (btn) =>
                btn.type === ComponentType.Button &&
                btn.customId?.startsWith(GIVEAWAY_REWARD_BUTTON_CUSTOM_ID),
            );
          });
          if (newComponents.length !== resultsMessage.components.length) {
            await resultsMessage.edit({ components: newComponents });
          }
        }
      }
    }
    return;
  }

  if (
    itx.customId !== GIVEAWAY_REWARD_BUTTON_CUSTOM_ID &&
    !itx.customId.startsWith(`${GIVEAWAY_REWARD_BUTTON_CUSTOM_ID}:`)
  )
    return;

  await itx.deferReply({ flags: "Ephemeral" });

  if (!hasStaffPermission) {
    return await errorFollowUp(itx, "Nie masz uprawnień do rozdawania nagród z tego giveawaya.");
  }

  // The button may live on the results message (a reply), whose messageId
  // differs from the giveaway's stored messageId. Prefer the giveaway id
  // embedded in the custom id, falling back to a message-based lookup.
  const idMatch = itx.customId.match(/^giveaway-reward:(\d+)$/);
  let giveaway;
  if (idMatch?.[1]) {
    giveaway = await prisma.giveaway.findFirst({
      where: { id: Number.parseInt(idMatch[1], 10), guildId: itx.guildId },
    });
  } else {
    giveaway = await prisma.giveaway.findFirst({
      where: {
        guildId: itx.message.guildId,
        channelId: itx.message.channelId,
        messageId: itx.message.id,
      },
    });
  }
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
    const remainingComponents = itx.message.components.filter((c) => {
      if (c.type !== ComponentType.ActionRow) return true;
      return !c.components.some(
        (btn) =>
          btn.type === ComponentType.Button &&
          btn.customId?.startsWith(GIVEAWAY_REWARD_BUTTON_CUSTOM_ID),
      );
    });
    await itx.message.edit({ components: remainingComponents });
    await itx.editReply("Wszystkie nagrody zostały już rozdane.");
    return;
  }

  await itx.editReply({
    content: `${menuContent}\n\nWybierz rodzaj nagród do rozdania:`,
    components: [menuRow],
  });
};
