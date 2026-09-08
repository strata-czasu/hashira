import { EmbedBuilder, messageLink, type Guild, type User } from "discord.js";

import type { ExtractContext } from "@hashira/core";
import type { Giveaway, GiveawayReward } from "@hashira/db";

import type { base } from "../base";
import { fetchMembers } from "../util/fetchMembers";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { distributeEconomyReward, distributeMuteReward } from "./rewardDistribution";

type BaseContext = ExtractContext<typeof base>;

export type RewardDistributionReply = string | { embeds: EmbedBuilder[] };

export type EconomyRewardType = "currency" | "item";

export type PendingReward = {
  reward: GiveawayReward;
  pendingWinnerIds: string[];
};

export type PendingRewards = {
  currency: PendingReward[];
  items: PendingReward[];
  mutes: PendingReward[];
};

type RewardWithWinners = GiveawayReward & { winners: { userId: string }[] };

type RewardDistributionRow = { rewardId: number; userId: string };

/**
 * Groups rewards that still have unhanded winners into currency, items and
 * mutes. Rewards that were already fully distributed (all winners have a
 * `GiveawayRewardDistribution` row) are omitted. Rewards with unknown type and
 * winners without a reward type are skipped as well.
 */
export const groupPendingRewards = (
  rewards: RewardWithWinners[],
  distributions: RewardDistributionRow[],
): PendingRewards => {
  const distributedByReward = new Map<number, Set<string>>();
  for (const { rewardId, userId } of distributions) {
    const userIds = distributedByReward.get(rewardId) ?? new Set<string>();
    userIds.add(userId);
    distributedByReward.set(rewardId, userIds);
  }

  const result: PendingRewards = { currency: [], items: [], mutes: [] };

  for (const reward of rewards) {
    const distributed = distributedByReward.get(reward.id) ?? new Set<string>();
    const pendingWinnerIds = reward.winners
      .map(({ userId }) => userId)
      .filter((userId) => !distributed.has(userId));
    if (pendingWinnerIds.length === 0) continue;

    const pending: PendingReward = { reward, pendingWinnerIds };
    switch (reward.type) {
      case "currency":
        result.currency.push(pending);
        break;

      case "item":
        result.items.push(pending);
        break;

      case "mute":
        result.mutes.push(pending);
        break;

      default:
        break;
    }
  }

  return result;
};

/**
 * Fetches all giveaway rewards with their winners and marks which users already
 * received them, so the menu only lists rewards that still await distribution.
 */
export const getPendingGiveawayRewards = async (
  prisma: BaseContext["prisma"],
  giveawayId: number,
): Promise<PendingRewards> => {
  const rewards = await prisma.giveawayReward.findMany({
    where: { giveawayId },
    include: { winners: true },
  });

  const distributions = await prisma.giveawayRewardDistribution.findMany({
    where: { rewardId: { in: rewards.map((reward) => reward.id) } },
    select: { rewardId: true, userId: true },
  });

  return groupPendingRewards(rewards, distributions);
};

type DistributeEconomyRewardsOptions = {
  prisma: BaseContext["prisma"];
  economyLog: BaseContext["economyLog"];
  guild: Guild;
  moderator: User;
  giveaway: Giveaway;
  rewardTypes: readonly EconomyRewardType[];
  reply: (content: RewardDistributionReply) => Promise<unknown>;
};

/**
 * Hands out currency and/or item rewards of an ended giveaway to the winners
 * that have not received them yet. Idempotent thanks to
 * `GiveawayRewardDistribution` rows created for each granted user. Every winner
 * gets a DM with the list of granted rewards and a link to the giveaway message.
 */
export const distributeGiveawayEconomyRewards = async ({
  prisma,
  economyLog,
  guild,
  moderator,
  giveaway,
  rewardTypes,
  reply,
}: DistributeEconomyRewardsOptions): Promise<void> => {
  const rewards = await prisma.giveawayReward.findMany({
    where: { giveawayId: giveaway.id },
    include: { winners: true, item: true },
  });

  const payoutRewards = rewards.filter(
    (reward) => reward.type !== null && reward.type !== "mute" && rewardTypes.includes(reward.type),
  );
  const lines: string[] = [];
  const wonByUser = new Map<string, string[]>();
  const outcomeless: string[] = [];

  for (const reward of payoutRewards) {
    const outcome = await distributeEconomyReward({
      prisma,
      economyLog,
      guild,
      moderator,
      giveawayId: giveaway.id.toString(),
      reward,
    });

    if (outcome.failure) {
      outcomeless.push(`${reward.reward}: ${outcome.failure}`);
      continue;
    }

    if (outcome.grantedUserIds.length === 0 && outcome.overLimitUserIds.length === 0) {
      continue;
    }

    for (const userId of outcome.grantedUserIds) {
      const userWins = wonByUser.get(userId) ?? [];
      userWins.push(reward.reward);
      wonByUser.set(userId, userWins);
    }

    const granted = outcome.grantedUserIds.map((userId) => `<@${userId}>`);
    const overLimit = outcome.overLimitUserIds.map((userId) => `<@${userId}>`);
    const parts: string[] = [];
    if (granted.length > 0) {
      parts.push(`**${reward.reward}** → ${granted.join(" ")}`);
    }
    if (overLimit.length > 0) {
      parts.push(`${reward.reward} (limit przedmiotu) → ${overLimit.join(" ")}`);
    }
    lines.push(parts.join("\n"));
  }

  const winners = await fetchMembers(guild, [...wonByUser.keys()]);
  const giveawayLink = messageLink(giveaway.channelId, giveaway.messageId, giveaway.guildId);
  for (const [userId, rewardsList] of wonByUser) {
    const member = winners.get(userId);
    if (!member) continue;
    await sendDirectMessage(
      member.user,
      `Gratulacje! Nadano Ci wygraną z giveawayu #${giveaway.id}: ${rewardsList.join(
        ", ",
      )}\n${giveawayLink}`,
    );
  }

  if (lines.length === 0 && outcomeless.length === 0) {
    await reply("Wszystkie nagrody dla tego giveawaya zostały już rozdane lub brak nagród.");
    return;
  }

  await reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Rozdano nagrody")
        .setDescription(
          [
            ...lines,
            ...(outcomeless.length > 0 ? ["", ...outcomeless.map((line) => `⚠️ ${line}`)] : []),
          ].join("\n"),
        )
        .setFooter({ text: `Giveaway #${giveaway.id}` })
        .setURL(messageLink(giveaway.channelId, giveaway.messageId, giveaway.guildId)),
    ],
  });
};

type DistributeMuteRewardsOptions = {
  prisma: BaseContext["prisma"];
  messageQueue: BaseContext["messageQueue"];
  log: BaseContext["moderationLog"];
  guild: Guild;
  moderator: User;
  giveaway: Giveaway;
  reply: (content: RewardDistributionReply) => Promise<unknown>;
};

/**
 * Applies all mute rewards of an ended giveaway to the winners that are not
 * muted yet. Idempotent per `GiveawayRewardDistribution` row.
 */
export const distributeGiveawayMutes = async ({
  prisma,
  messageQueue,
  log,
  guild,
  moderator,
  giveaway,
  reply,
}: DistributeMuteRewardsOptions): Promise<void> => {
  const rewards = await prisma.giveawayReward.findMany({
    where: { giveawayId: giveaway.id, type: "mute" },
    include: { winners: true },
  });

  const lines: string[] = [];
  const notices: string[] = [];

  for (const reward of rewards) {
    const outcome = await distributeMuteReward({
      prisma,
      messageQueue,
      log,
      guild,
      moderator,
      giveawayId: giveaway.id.toString(),
      reward,
    });

    if (outcome.mutedUserIds.length > 0) {
      const mentions = outcome.mutedUserIds.map((userId) => `<@${userId}>`).join(" ");
      lines.push(`**${reward.reward}** → ${mentions}`);
    }
    for (const failed of outcome.failedUsers) {
      notices.push(`⚠️ <@${failed.userId}>: ${failed.reason}`);
    }
    notices.push(...outcome.notes);
  }

  if (lines.length === 0 && notices.length === 0) {
    await reply("Ten giveaway nie ma nagród typu mute, albo wszystkie już nałożono.");
    return;
  }

  await reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Rozdano nagrody")
        .setDescription([...lines, ...(notices.length > 0 ? ["", ...notices] : [])].join("\n"))
        .setFooter({ text: `Giveaway #${giveaway.id}` })
        .setURL(messageLink(giveaway.channelId, giveaway.messageId, giveaway.guildId)),
    ],
  });
};
