import {
  type Birthday2026TextEarningConfig,
  type ExtendedPrismaClient,
  isUniqueConstraintError,
  type PrismaTransaction,
} from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";

import { addBalance } from "../../economy/managers/transferManager";
import { claimBirthday2026Config } from "./configService";
import { getBirthday2026EventDayIndex, getBirthday2026EventState } from "./eventState";

export type Birthday2026TextEarningErrorReason =
  | "activity_before_join"
  | "config_not_found"
  | "daily_cap_reached"
  | "disabled_channel"
  | "economy_not_configured"
  | "event_not_open"
  | "invalid_daily_cap"
  | "invalid_occurred_at"
  | "invalid_window"
  | "member_not_found"
  | "text_earning_not_configured";

export type ConfigureBirthday2026TextEarningResult =
  | { ok: true; config: Birthday2026TextEarningConfig }
  | {
      ok: false;
      reason: "config_not_found" | "invalid_daily_cap" | "invalid_window";
    };

export const configureBirthday2026TextEarning = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    windowSeconds: number;
    dailyCap: number;
  },
): Promise<ConfigureBirthday2026TextEarningResult> => {
  if (!Number.isSafeInteger(input.windowSeconds) || input.windowSeconds <= 0) {
    return { ok: false, reason: "invalid_window" };
  }
  if (!Number.isSafeInteger(input.dailyCap) || input.dailyCap <= 0) {
    return { ok: false, reason: "invalid_daily_cap" };
  }

  return prisma.$transaction(async (tx) => {
    const config = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      include: { textEarning: true },
    });
    if (!config) return { ok: false, reason: "config_not_found" };
    if (
      config.textEarning?.windowSeconds === input.windowSeconds &&
      config.textEarning.dailyCap === input.dailyCap
    ) {
      return { ok: true, config: config.textEarning };
    }

    const textEarning = await tx.birthday2026TextEarningConfig.upsert({
      where: { configId: config.id },
      create: {
        configId: config.id,
        windowSeconds: input.windowSeconds,
        dailyCap: input.dailyCap,
      },
      update: {
        windowSeconds: input.windowSeconds,
        dailyCap: input.dailyCap,
      },
    });

    return { ok: true, config: textEarning };
  });
};

export const disableBirthday2026TextChannels = async (
  prisma: PrismaTransaction,
  guildId: string,
  channelIds: string[],
) => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    select: { textEarning: { select: { configId: true } } },
  });
  if (!config) return { ok: false, reason: "config_not_found" } as const;
  if (!config.textEarning) {
    return { ok: false, reason: "text_earning_not_configured" } as const;
  }
  const configId = config.textEarning.configId;

  const result = await prisma.birthday2026DisabledTextChannel.createMany({
    data: channelIds.map((channelId) => ({
      configId,
      channelId,
    })),
    skipDuplicates: true,
  });
  return {
    ok: true,
    changed: result.count > 0,
    channelIds,
  } as const;
};

export const enableBirthday2026TextChannels = async (
  prisma: PrismaTransaction,
  guildId: string,
  channelIds: string[],
) => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    select: { textEarning: { select: { configId: true } } },
  });
  if (!config) return { ok: false, reason: "config_not_found" } as const;
  if (!config.textEarning) {
    return { ok: false, reason: "text_earning_not_configured" } as const;
  }
  const configId = config.textEarning.configId;

  const result = await prisma.birthday2026DisabledTextChannel.deleteMany({
    where: {
      configId,
      channelId: { in: channelIds },
    },
  });
  return {
    ok: true,
    changed: result.count > 0,
    channelIds,
  } as const;
};

export const findBirthday2026DisabledTextChannels = async (
  prisma: PrismaTransaction,
  guildId: string,
) => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    select: { textEarning: { select: { configId: true } } },
  });
  if (!config?.textEarning) return null;

  return prisma.birthday2026DisabledTextChannel.findMany({
    where: { configId: config.textEarning.configId },
    orderBy: { channelId: "asc" },
  });
};

export const getBirthday2026TextEarningDiagnostics = async (
  prisma: PrismaTransaction,
  guildId: string,
) => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    select: {
      id: true,
      textEarning: true,
    },
  });
  if (!config?.textEarning) return null;

  const [dailyCounters, awardedTransactions] = await Promise.all([
    prisma.birthday2026DailyTextEarning.aggregate({
      where: { configId: config.id },
      _count: { _all: true },
      _sum: { awardedWindows: true },
    }),
    prisma.birthday2026PersonalTransaction.count({
      where: { configId: config.id, source: "textActivity" },
    }),
  ]);
  const counterTotal = dailyCounters._sum.awardedWindows ?? 0;

  return {
    windowSeconds: config.textEarning.windowSeconds,
    dailyCap: config.textEarning.dailyCap,
    awardedTransactions,
    counterTotal,
    dailyRows: dailyCounters._count._all,
    reconciled: counterTotal === awardedTransactions,
  };
};

type TextAwardDetails = {
  eventDayIndex: number;
  windowIndex: number;
  dailyAwardedWindows: number;
  transactionId: number;
  walletBalance: number;
};

type Birthday2026TextAwardedResult = {
  ok: true;
  status: "awarded" | "duplicate";
} & TextAwardDetails;

export type AwardBirthday2026TextPaszaResult =
  | Birthday2026TextAwardedResult
  | { ok: false; reason: Birthday2026TextEarningErrorReason };

const findExistingTextAward = async (
  prisma: PrismaTransaction,
  input: {
    configId: number;
    userId: string;
    sourceKey: string;
    eventDayIndex: number;
    windowIndex: number;
  },
): Promise<Birthday2026TextAwardedResult | null> => {
  const reference = await prisma.birthday2026PersonalTransaction.findUnique({
    where: {
      configId_source_sourceKey: {
        configId: input.configId,
        source: "textActivity",
        sourceKey: input.sourceKey,
      },
    },
    include: {
      transaction: {
        include: { wallet: { select: { balance: true } } },
      },
    },
  });
  if (!reference) return null;

  const dailyState = await prisma.birthday2026DailyTextEarning.findUnique({
    where: {
      configId_userId_eventDayIndex: {
        configId: input.configId,
        userId: input.userId,
        eventDayIndex: input.eventDayIndex,
      },
    },
    select: { awardedWindows: true },
  });

  return {
    ok: true,
    status: "duplicate",
    eventDayIndex: input.eventDayIndex,
    windowIndex: input.windowIndex,
    dailyAwardedWindows: dailyState?.awardedWindows ?? 0,
    transactionId: reference.transactionId,
    walletBalance: reference.transaction.wallet.balance,
  };
};

export const awardBirthday2026TextPasza = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    userId: string;
    channelId: string;
    occurredAt: Date;
  },
): Promise<AwardBirthday2026TextPaszaResult> => {
  if (!Number.isFinite(input.occurredAt.getTime())) {
    return { ok: false, reason: "invalid_occurred_at" };
  }

  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId: input.guildId },
    include: {
      economy: { select: { currencyId: true } },
      textEarning: {
        include: {
          disabledChannels: {
            where: { channelId: input.channelId },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!config) return { ok: false, reason: "config_not_found" };
  if (getBirthday2026EventState(config, input.occurredAt) !== "open") {
    return { ok: false, reason: "event_not_open" };
  }
  if (!config.economy) {
    return { ok: false, reason: "economy_not_configured" };
  }
  if (!config.textEarning) {
    return { ok: false, reason: "text_earning_not_configured" };
  }
  const currencyId = config.economy.currencyId;
  const textDailyCap = config.textEarning.dailyCap;
  const textWindowSeconds = config.textEarning.windowSeconds;
  if (config.textEarning.disabledChannels.length > 0) {
    return { ok: false, reason: "disabled_channel" };
  }

  const membership = await prisma.birthday2026MemberState.findUnique({
    where: {
      configId_userId: {
        configId: config.id,
        userId: input.userId,
      },
    },
    select: { joinedAt: true },
  });
  if (!membership) return { ok: false, reason: "member_not_found" };
  if (input.occurredAt < membership.joinedAt) {
    return { ok: false, reason: "activity_before_join" };
  }

  const eventDayIndex = getBirthday2026EventDayIndex(config, input.occurredAt);
  if (eventDayIndex === null) {
    return { ok: false, reason: "event_not_open" };
  }
  const elapsedSeconds = Math.floor(
    (input.occurredAt.getTime() - config.eventStartAt.getTime()) / 1000,
  );
  const windowIndex = Math.floor(elapsedSeconds / textWindowSeconds);
  const sourceKey = `${input.userId}:${eventDayIndex}:${windowIndex}`;

  const existing = await findExistingTextAward(prisma, {
    configId: config.id,
    userId: input.userId,
    sourceKey,
    eventDayIndex,
    windowIndex,
  });
  if (existing) return existing;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const state = await claimBirthday2026Config(tx, config.id);
      if (!state.enabled || state.settlement) {
        return { ok: false, reason: "event_not_open" } as const;
      }
      await tx.birthday2026DailyTextEarning.createMany({
        data: {
          configId: config.id,
          userId: input.userId,
          eventDayIndex,
          awardedWindows: 0,
        },
        skipDuplicates: true,
      });

      const counterUpdate = await tx.birthday2026DailyTextEarning.updateMany({
        where: {
          configId: config.id,
          userId: input.userId,
          eventDayIndex,
          awardedWindows: { lt: textDailyCap },
        },
        data: { awardedWindows: { increment: 1 } },
      });
      if (counterUpdate.count === 0) return null;

      const { transaction, wallet } = await addBalance({
        prisma: nestedTransaction(tx),
        guildId: input.guildId,
        toUserId: input.userId,
        amount: 1,
        reason: `Birthday 2026 text activity: day ${eventDayIndex}, window ${windowIndex}`,
        currencyId,
      });
      await tx.birthday2026PersonalTransaction.create({
        data: {
          configId: config.id,
          userId: input.userId,
          transactionId: transaction.id,
          source: "textActivity",
          sourceKey,
          createdAt: input.occurredAt,
        },
      });
      const dailyState = await tx.birthday2026DailyTextEarning.findUniqueOrThrow({
        where: {
          configId_userId_eventDayIndex: {
            configId: config.id,
            userId: input.userId,
            eventDayIndex,
          },
        },
      });

      return {
        ok: true,
        status: "awarded",
        eventDayIndex,
        windowIndex,
        dailyAwardedWindows: dailyState.awardedWindows,
        transactionId: transaction.id,
        walletBalance: wallet.balance,
      } satisfies Birthday2026TextAwardedResult;
    });

    return result ?? { ok: false, reason: "daily_cap_reached" };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const duplicate = await findExistingTextAward(prisma, {
      configId: config.id,
      userId: input.userId,
      sourceKey,
      eventDayIndex,
      windowIndex,
    });
    if (!duplicate) throw error;
    return duplicate;
  }
};
