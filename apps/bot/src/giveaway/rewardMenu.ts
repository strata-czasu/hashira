import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import type { PendingReward, PendingRewards } from "./rewardHandout";

export const GIVEAWAY_REWARD_BUTTON_CUSTOM_ID = "giveaway-reward";
export const GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX = "giveaway-reward-currency";
export const GIVEAWAY_REWARD_ITEMS_BUTTON_PREFIX = "giveaway-reward-items";
export const GIVEAWAY_REWARD_MUTE_BUTTON_PREFIX = "giveaway-reward-mute";

/**
 * Creates the action row that sits under the giveaway (reward) message. Clicking
 * the button opens an ephemeral menu with the still unhanded rewards split by
 * type and the distribution actions the clicking staff member is allowed to run.
 */
export function createRewardButtonRow(): ActionRowBuilder<ButtonBuilder> {
  const rewardButton = new ButtonBuilder()
    .setCustomId(GIVEAWAY_REWARD_BUTTON_CUSTOM_ID)
    .setLabel("Rozdaj nagrody")
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(rewardButton);
}

const formatPendingReward = ({ reward, pendingWinnerIds }: PendingReward): string => {
  const mentions = pendingWinnerIds.map((userId) => `<@${userId}>`).join(" ");
  return `${reward.reward} -> ${mentions}`;
};

/**
 * Builds the ephemeral menu content describing which rewards still await
 * distribution, split into currency, items and mutes. Sections with no pending
 * rewards are omitted.
 */
export function buildRewardMenuContent(pending: PendingRewards): string {
  const sections: string[] = [];

  if (pending.currency.length > 0) {
    sections.push(`Punkty do rozdania:\n${pending.currency.map(formatPendingReward).join("\n")}`);
  }

  if (pending.items.length > 0) {
    sections.push(`Itemy do rozdania:\n${pending.items.map(formatPendingReward).join("\n")}`);
  }

  if (pending.mutes.length > 0) {
    sections.push(`Mute do rozdania:\n${pending.mutes.map(formatPendingReward).join("\n")}`);
  }

  return sections.length === 0 ? "Wszystkie nagrody zostały już rozdane." : sections.join("\n\n");
}

export type RewardMenuOptions = {
  canDistributeCurrency: boolean;
  canDistributeItems: boolean;
  canDistributeMutes: boolean;
  hasCurrencyRewards: boolean;
  hasItemRewards: boolean;
  hasMuteRewards: boolean;
  giveawayId: number;
};

/**
 * Builds the ephemeral menu row with the distribution buttons. Each button is
 * only added when the clicking moderator has the permission required to run it
 * and there are still rewards of that type to hand out. Returns null when no
 * action is available to the user.
 */
export function createRewardMenuRow({
  canDistributeCurrency,
  canDistributeItems,
  canDistributeMutes,
  hasCurrencyRewards,
  hasItemRewards,
  hasMuteRewards,
  giveawayId,
}: RewardMenuOptions): ActionRowBuilder<ButtonBuilder> | null {
  const distributionButtons: ButtonBuilder[] = [];

  if (canDistributeCurrency && hasCurrencyRewards) {
    distributionButtons.push(
      new ButtonBuilder()
        .setCustomId(`${GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX}:${giveawayId}`)
        .setLabel("Rozdaj punkty")
        .setStyle(ButtonStyle.Primary),
    );
  }

  if (canDistributeItems && hasItemRewards) {
    distributionButtons.push(
      new ButtonBuilder()
        .setCustomId(`${GIVEAWAY_REWARD_ITEMS_BUTTON_PREFIX}:${giveawayId}`)
        .setLabel("Rozdaj itemy")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  if (canDistributeMutes && hasMuteRewards) {
    distributionButtons.push(
      new ButtonBuilder()
        .setCustomId(`${GIVEAWAY_REWARD_MUTE_BUTTON_PREFIX}:${giveawayId}`)
        .setLabel("Rozdaj mute")
        .setStyle(ButtonStyle.Danger),
    );
  }

  if (distributionButtons.length === 0) return null;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(...distributionButtons);
}
