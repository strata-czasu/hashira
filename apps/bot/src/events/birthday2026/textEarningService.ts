import type {
  Birthday2026DisabledTextChannel,
  Birthday2026TextEarningConfig,
  ExtendedPrismaClient,
  PrismaTransaction,
} from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { getDefaultWallet } from "../../economy/managers/walletManager";
import { isUniqueConstraintError } from "../../util/isUniqueConstraintError";
import { getBirthday2026EventDayIndex, getBirthday2026EventState } from "./eventState";

export type Birthday2026TextEarningErrorReason =
  | "activity_before_join"
  | "config_not_found"
  | "daily_cap_reached"
  | "disabled_channel"
  | "economy_not_configured"
  | "event_not_open"
  | "invalid_channel"
  | "invalid_daily_cap"
  | "invalid_occurred_at"
  | "invalid_window"
  | "member_not_found"
  | "text_earning_already_used"
  | "text_earning_not_configured";

export type ConfigureBirthday2026TextEarningResult =
  | { ok: true; config: Birthday2026TextEarningConfig }
  | {
      ok: false;
      reason:
        | "config_not_found"
        | "invalid_daily_cap"
        | "invalid_window"
        | "text_earning_already_used";
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

    const existingAward = await tx.birthday2026PersonalTransaction.findFirst({
      where: { configId: config.id, source: "textActivity" },
      select: { id: true },
    });
    if (existingAward) {
      return { ok: false, reason: "text_earning_already_used" };
    }

    return {
      ok: true,
      config: await tx.birthday2026TextEarningConfig.upsert({
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
      }),
    };
  });
};

export type Birthday2026DisabledTextChannelResult =
  | {
      ok: true;
      changed: boolean;
      channelId: string;
    }
  | {
      ok: false;
      reason: "config_not_found" | "invalid_channel" | "text_earning_not_configured";
    };

const normalizeChannelId = (channelId: string) => {
  const normalized = channelId.trim();
  return normalized.length > 0 ? normalized : null;
};

export const disableBirthday2026TextChannel = async (
  prisma: PrismaTransaction,
  guildId: string,
  channelId: string,
): Promise<Birthday2026DisabledTextChannelResult> => {
  const normalizedChannelId = normalizeChannelId(channelId);
  if (!normalizedChannelId) return { ok: false, reason: "invalid_channel" };

  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    select: { textEarning: { select: { configId: true } } },
  });
  if (!config) return { ok: false, reason: "config_not_found" };
  if (!config.textEarning) {
    return { ok: false, reason: "text_earning_not_configured" };
  }

  const result = await prisma.birthday2026DisabledTextChannel.createMany({
    data: {
      configId: config.textEarning.configId,
      channelId: normalizedChannelId,
    },
    skipDuplicates: true,
  });
  return {
    ok: true,
    changed: result.count > 0,
    channelId: normalizedChannelId,
  };
};

export const enableBirthday2026TextChannel = async (
  prisma: PrismaTransaction,
  guildId: string,
  channelId: string,
): Promise<Birthday2026DisabledTextChannelResult> => {
  const normalizedChannelId = normalizeChannelId(channelId);
  if (!normalizedChannelId) return { ok: false, reason: "invalid_channel" };

  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    select: { textEarning: { select: { configId: true } } },
  });
  if (!config) return { ok: false, reason: "config_not_found" };
  if (!config.textEarning) {
    return { ok: false, reason: "text_earning_not_configured" };
  }

  const result = await prisma.birthday2026DisabledTextChannel.deleteMany({
    where: {
      configId: config.textEarning.configId,
      channelId: normalizedChannelId,
    },
  });
  return {
    ok: true,
    changed: result.count > 0,
    channelId: normalizedChannelId,
  };
};

export const findBirthday2026DisabledTextChannels = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Birthday2026DisabledTextChannel[] | null> => {
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

export type Birthday2026TextEarningDiagnostics = {
  windowSeconds: number;
  dailyCap: number;
  awardedTransactions: number;
  counterTotal: number;
  dailyRows: number;
  reconciled: boolean;
};

export const getBirthday2026TextEarningDiagnostics = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Birthday2026TextEarningDiagnostics | null> => {
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

export type AwardBirthday2026TextPaszaResult =
  | ({ ok: true; status: "awarded" | "duplicate" } & TextAwardDetails)
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
): Promise<Extract<AwardBirthday2026TextPaszaResult, { ok: true }> | null> => {
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
  const channelId = normalizeChannelId(input.channelId);
  if (!channelId) return { ok: false, reason: "invalid_channel" };

  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId: input.guildId },
    include: {
      economy: { select: { currencyId: true } },
      textEarning: {
        include: {
          disabledChannels: {
            where: { channelId },
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
      await tx.birthday2026DailyTextEarning.upsert({
        where: {
          configId_userId_eventDayIndex: {
            configId: config.id,
            userId: input.userId,
            eventDayIndex,
          },
        },
        create: {
          configId: config.id,
          userId: input.userId,
          eventDayIndex,
          awardedWindows: 0,
        },
        update: { awardedWindows: { increment: 0 } },
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

      const wallet = await getDefaultWallet({
        prisma: nestedTransaction(tx),
        guildId: input.guildId,
        userId: input.userId,
        currencyId,
      });
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: 1 } },
      });
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: 1,
          reason: `Birthday 2026 text activity: day ${eventDayIndex}, window ${windowIndex}`,
          transactionType: "add",
          entryType: "credit",
          createdAt: input.occurredAt,
        },
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
        walletBalance: updatedWallet.balance,
      } satisfies AwardBirthday2026TextPaszaResult;
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
