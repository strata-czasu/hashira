/** @jsxImportSource @hashira/jsx */
import { ButtonStyle } from "discord.js";

import { ActionRow, Button, Br, H3, TextDisplay, type JSXNode } from "@hashira/jsx";

import type { PendingReward, PendingRewards } from "./rewardHandout";

export const GIVEAWAY_REWARD_BUTTON_CUSTOM_ID = "giveaway-reward";
export const GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX = "giveaway-reward-currency";
export const GIVEAWAY_REWARD_ITEMS_BUTTON_PREFIX = "giveaway-reward-items";
export const GIVEAWAY_REWARD_MUTE_BUTTON_PREFIX = "giveaway-reward-mute";

export function createRewardButtonRow(giveawayId?: number) {
  return (
    <ActionRow>
      <Button
        customId={
          giveawayId
            ? `${GIVEAWAY_REWARD_BUTTON_CUSTOM_ID}:${giveawayId}`
            : GIVEAWAY_REWARD_BUTTON_CUSTOM_ID
        }
        label="Rozdaj nagrody"
        style={ButtonStyle.Secondary}
      />
    </ActionRow>
  );
}

const formatPendingReward = ({ reward, pendingWinnerIds }: PendingReward): string => {
  const mentions = pendingWinnerIds.map((userId) => `<@${userId}>`).join(" ");
  return `${reward.reward} -> ${mentions}`;
};

export function buildRewardMenuContent(pending: PendingRewards) {
  const sections: JSXNode[] = [];

  if (pending.currency.length > 0) {
    sections.push(
      <>
        <H3>Punkty do rozdania:</H3>
        <Br />
        {pending.currency.map((r, i) => (
          <>
            {i > 0 && <Br />}
            {formatPendingReward(r)}
          </>
        ))}
      </>,
    );
  }

  if (pending.items.length > 0) {
    sections.push(
      <>
        <Br />
        <Br />
        <H3>Itemy do rozdania:</H3>
        <Br />
        {pending.items.map((r, i) => (
          <>
            {i > 0 && <Br />}
            {formatPendingReward(r)}
          </>
        ))}
      </>,
    );
  }

  if (pending.mutes.length > 0) {
    sections.push(
      <>
        <Br />
        <Br />
        <H3>Mute do rozdania:</H3>
        <Br />
        {pending.mutes.map((r, i) => (
          <>
            {i > 0 && <Br />}
            {formatPendingReward(r)}
          </>
        ))}
      </>,
    );
  }

  if (sections.length === 0) {
    return <TextDisplay content="Wszystkie nagrody zostały już rozdane." />;
  }

  return <TextDisplay>{sections}</TextDisplay>;
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

export function createRewardMenuRow({
  canDistributeCurrency,
  canDistributeItems,
  canDistributeMutes,
  hasCurrencyRewards,
  hasItemRewards,
  hasMuteRewards,
  giveawayId,
}: RewardMenuOptions) {
  const buttons: JSXNode[] = [];

  if (canDistributeCurrency && hasCurrencyRewards) {
    buttons.push(
      <Button
        customId={`${GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX}:${giveawayId}`}
        label="Rozdaj punkty"
        style={ButtonStyle.Primary}
      />,
    );
  }

  if (canDistributeItems && hasItemRewards) {
    buttons.push(
      <Button
        customId={`${GIVEAWAY_REWARD_ITEMS_BUTTON_PREFIX}:${giveawayId}`}
        label="Rozdaj itemy"
        style={ButtonStyle.Secondary}
      />,
    );
  }

  if (canDistributeMutes && hasMuteRewards) {
    buttons.push(
      <Button
        customId={`${GIVEAWAY_REWARD_MUTE_BUTTON_PREFIX}:${giveawayId}`}
        label="Rozdaj mute"
        style={ButtonStyle.Danger}
      />,
    );
  }

  if (buttons.length === 0) return null;

  return <ActionRow>{buttons}</ActionRow>;
}
