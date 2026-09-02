import type { ExtractContext } from "@hashira/core";
import type { GiveawayReward, Item } from "@hashira/db";
import type { Guild, User } from "discord.js";
import type { base } from "../base";
import { grantItemToUsers } from "../economy/managers/inventoryService";
import { addBalances } from "../economy/managers/transferManager";
import { universalAddMute } from "../moderation/mutes";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { formatDuration, secondsToDuration } from "../util/duration";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { fetchMembers } from "../util/fetchMembers";

type BaseContext = ExtractContext<typeof base>;

type GiveawayRewardWithWinners = GiveawayReward & {
  winners: { userId: string }[];
};

type RewardWithDetails = GiveawayRewardWithWinners & {
  item: Item | null;
};

export type EconomyDistributionOutcome = {
  rewardId: string;
  grantedUserIds: string[];
  overLimitUserIds: string[];
  failure: string | null;
};

type DistributeEconomyRewardOptions = {
  prisma: BaseContext["prisma"];
  economyLog: BaseContext["economyLog"];
  guild: Guild;
  moderator: User;
  giveawayId: string;
  reward: RewardWithDetails;
};

const getAlreadyDistributedUserIds = (
  prisma: BaseContext["prisma"],
  rewardId: number,
  userIds: string[],
) =>
  prisma.giveawayRewardDistribution
    .findMany({
      where: { rewardId, userId: { in: userIds } },
      select: { userId: true },
    })
    .then((rows) => new Set(rows.map((row) => row.userId)));

/**
 * Hands out a single currency or item reward to the giveaway winners that have
 * not received it yet. Idempotent thanks to `GiveawayRewardDistribution`
 * rows created for each granted user.
 */
export const distributeEconomyReward = async ({
  prisma,
  economyLog,
  guild,
  moderator,
  giveawayId,
  reward,
}: DistributeEconomyRewardOptions): Promise<EconomyDistributionOutcome> => {
  const allUserIds = [...new Set(reward.winners.map(({ userId }) => userId))];
  const alreadyDistributed = await getAlreadyDistributedUserIds(
    prisma,
    reward.id,
    allUserIds,
  );
  const pendingUserIds = allUserIds.filter((userId) => !alreadyDistributed.has(userId));

  if (pendingUserIds.length === 0) {
    return {
      rewardId: `${reward.id}`,
      grantedUserIds: [],
      overLimitUserIds: [],
      failure: null,
    };
  }

  await ensureUsersExist(prisma, pendingUserIds);
  const members = await fetchMembers(guild, pendingUserIds);
  const users = members
    .map((member) => member.user)
    .filter((user) => pendingUserIds.includes(user.id));

  const reason = `Wygrana w giveawayu #${giveawayId}`;

  if (reward.type === "currency") {
    const amount = reward.currencyValue;
    if (amount === null) {
      return {
        rewardId: `${reward.id}`,
        grantedUserIds: [],
        overLimitUserIds: [],
        failure: "Nie udało się ustalić ilości punktów dla tej nagrody.",
      };
    }

    try {
      await addBalances({
        prisma,
        toUserIds: pendingUserIds,
        guildId: guild.id,
        amount,
        reason,
        currencySymbol: STRATA_CZASU_CURRENCY.symbol,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nieznany błąd";
      return {
        rewardId: `${reward.id}`,
        grantedUserIds: [],
        overLimitUserIds: [],
        failure: `Nie udało się dodać punktów: ${message}`,
      };
    }

    await economyLog.push("currencyAdd", guild, {
      moderator,
      toUsers: users,
      amount,
      reason,
    });

    await prisma.giveawayRewardDistribution.createMany({
      data: pendingUserIds.map((userId) => ({
        rewardId: reward.id,
        userId,
      })),
      skipDuplicates: true,
    });

    return {
      rewardId: `${reward.id}`,
      grantedUserIds: pendingUserIds,
      overLimitUserIds: [],
      failure: null,
    };
  }

  if (reward.type === "item") {
    if (!reward.item) {
      return {
        rewardId: `${reward.id}`,
        grantedUserIds: [],
        overLimitUserIds: [],
        failure: "Nie znaleziono przedmiotu dla tej nagrody.",
      };
    }

    const { grantedUserIds, overLimitUserIds } = await grantItemToUsers({
      prisma,
      item: reward.item,
      userIds: pendingUserIds,
    });

    const grantedUsers = users.filter((user) => grantedUserIds.includes(user.id));

    await economyLog.push("itemAddToInventory", guild, {
      moderator,
      users: grantedUsers,
      item: reward.item,
      quantity: 1,
    });

    await prisma.giveawayRewardDistribution.createMany({
      data: grantedUserIds.map((userId) => ({
        rewardId: reward.id,
        userId,
      })),
      skipDuplicates: true,
    });

    return {
      rewardId: `${reward.id}`,
      grantedUserIds,
      overLimitUserIds,
      failure: null,
    };
  }

  return {
    rewardId: `${reward.id}`,
    grantedUserIds: [],
    overLimitUserIds: [],
    failure: "Ten typ nagrody nie jest obsługiwany przez tę komendę.",
  };
};

export type MuteDistributionOutcome = {
  rewardId: string;
  mutedUserIds: string[];
  failedUsers: { userId: string; reason: string }[];
  notes: string[];
};

type DistributeMuteRewardOptions = {
  prisma: BaseContext["prisma"];
  messageQueue: BaseContext["messageQueue"];
  log: BaseContext["moderationLog"];
  guild: Guild;
  moderator: User;
  giveawayId: string;
  reward: GiveawayRewardWithWinners;
};

/**
 * Applies a mute reward to the giveaway winners that have not been muted yet.
 * Idempotent per `GiveawayRewardDistribution` row.
 */
export const distributeMuteReward = async ({
  prisma,
  messageQueue,
  log,
  guild,
  moderator,
  giveawayId,
  reward,
}: DistributeMuteRewardOptions): Promise<MuteDistributionOutcome> => {
  const allUserIds = [...new Set(reward.winners.map(({ userId }) => userId))];
  const alreadyDistributed = await getAlreadyDistributedUserIds(
    prisma,
    reward.id,
    allUserIds,
  );
  const pendingUserIds = allUserIds.filter((userId) => !alreadyDistributed.has(userId));

  const mutedUserIds: string[] = [];
  const failedUsers: { userId: string; reason: string }[] = [];
  const notes: string[] = [];

  if (pendingUserIds.length === 0) {
    return { rewardId: `${reward.id}`, mutedUserIds, failedUsers, notes };
  }

  if (reward.muteDurationSeconds === null) {
    return {
      rewardId: `${reward.id}`,
      mutedUserIds,
      failedUsers: pendingUserIds.map((userId) => ({
        userId,
        reason: "Nagroda nie zawiera czasu wyciszenia.",
      })),
      notes,
    };
  }

  const duration = formatDuration(secondsToDuration(reward.muteDurationSeconds));
  const reason = `Wygrana w giveawayu #${giveawayId}`;
  const context = { prisma, messageQueue, log, guild, moderator };

  for (const userId of pendingUserIds) {
    try {
      const mute = await universalAddMute({
        ...context,
        userId,
        duration,
        reason,
        reply: async (content) => {
          notes.push(content);
        },
        replyToModerator: async (content) => {
          notes.push(content);
        },
      });

      if (mute) mutedUserIds.push(userId);
      else failedUsers.push({ userId, reason: "Wyciszenie nie zostało nałożone." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nieznany błąd";
      failedUsers.push({ userId, reason: message });
    }
  }

  if (mutedUserIds.length > 0) {
    await prisma.giveawayRewardDistribution.createMany({
      data: mutedUserIds.map((userId) => ({
        rewardId: reward.id,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  return { rewardId: `${reward.id}`, mutedUserIds, failedUsers, notes };
};
