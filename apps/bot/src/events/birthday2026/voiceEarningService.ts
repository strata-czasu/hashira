import type {
  Birthday2026VoiceEarningConfig,
  ExtendedPrismaClient,
  PrismaTransaction,
} from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { getDefaultWallet } from "../../economy/managers/walletManager";
import { lockBirthday2026Config } from "./configService";
import { getBirthday2026EventDayIndex, getBirthday2026EventState } from "./eventState";

export type ConfigureBirthday2026VoiceEarningResult =
  | { ok: true; config: Birthday2026VoiceEarningConfig }
  | {
      ok: false;
      reason:
        | "config_not_found"
        | "invalid_daily_cap"
        | "invalid_unit"
        | "voice_earning_already_used";
    };

export const configureBirthday2026VoiceEarning = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    unitSeconds: number;
    dailyCap: number;
  },
): Promise<ConfigureBirthday2026VoiceEarningResult> => {
  if (!Number.isSafeInteger(input.unitSeconds) || input.unitSeconds <= 0) {
    return { ok: false, reason: "invalid_unit" };
  }
  if (!Number.isSafeInteger(input.dailyCap) || input.dailyCap <= 0) {
    return { ok: false, reason: "invalid_daily_cap" };
  }

  return prisma.$transaction(async (tx) => {
    const config = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      include: { voiceEarning: true },
    });
    if (!config) return { ok: false, reason: "config_not_found" };
    if (
      config.voiceEarning?.unitSeconds === input.unitSeconds &&
      config.voiceEarning.dailyCap === input.dailyCap
    ) {
      return { ok: true, config: config.voiceEarning };
    }

    const existingAward = await tx.birthday2026PersonalTransaction.findFirst({
      where: { configId: config.id, source: "voiceActivity" },
      select: { id: true },
    });
    if (existingAward) {
      return { ok: false, reason: "voice_earning_already_used" };
    }

    return {
      ok: true,
      config: await tx.birthday2026VoiceEarningConfig.upsert({
        where: { configId: config.id },
        create: {
          configId: config.id,
          unitSeconds: input.unitSeconds,
          dailyCap: input.dailyCap,
        },
        update: {
          unitSeconds: input.unitSeconds,
          dailyCap: input.dailyCap,
        },
      }),
    };
  });
};

export type Birthday2026VoiceEarningDiagnostics = {
  awardedPasza: number;
  awardedTransactions: number;
  counterTotal: number;
  dailyCap: number;
  dailyRows: number;
  reconciled: boolean;
  unitSeconds: number;
};

export const getBirthday2026VoiceEarningDiagnostics = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Birthday2026VoiceEarningDiagnostics | null> => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    select: { id: true, voiceEarning: true },
  });
  if (!config?.voiceEarning) return null;

  const [dailyCounters, awards] = await Promise.all([
    prisma.birthday2026DailyVoiceEarning.aggregate({
      where: { configId: config.id },
      _count: { _all: true },
      _sum: { awardedUnits: true },
    }),
    prisma.birthday2026PersonalTransaction.findMany({
      where: { configId: config.id, source: "voiceActivity" },
      select: { transaction: { select: { amount: true } } },
    }),
  ]);
  const counterTotal = dailyCounters._sum.awardedUnits ?? 0;
  const awardedPasza = awards.reduce(
    (total, award) => total + award.transaction.amount,
    0,
  );

  return {
    awardedPasza,
    awardedTransactions: awards.length,
    counterTotal,
    dailyCap: config.voiceEarning.dailyCap,
    dailyRows: dailyCounters._count._all,
    reconciled: counterTotal === awardedPasza,
    unitSeconds: config.voiceEarning.unitSeconds,
  };
};

export type AwardBirthday2026VoicePaszaErrorReason =
  | "activity_before_join"
  | "config_not_found"
  | "economy_not_configured"
  | "event_not_open"
  | "member_not_found"
  | "voice_earning_not_configured"
  | "voice_session_not_found";

export type AwardBirthday2026VoicePaszaResult =
  | {
      ok: true;
      awardedUnits: number;
      dailyAwardedUnits: number;
      eligibleSeconds: number;
      eventDayIndex: number;
      status: "awarded" | "noop";
      walletBalance: number;
    }
  | { ok: false; reason: AwardBirthday2026VoicePaszaErrorReason };

export const awardBirthday2026VoicePasza = async (
  prisma: ExtendedPrismaClient,
  input: { voiceSessionId: number },
): Promise<AwardBirthday2026VoicePaszaResult> => {
  const voiceSession = await prisma.voiceSession.findUnique({
    where: { id: input.voiceSessionId },
    select: {
      guildId: true,
      id: true,
      joinedAt: true,
      leftAt: true,
      userId: true,
    },
  });
  if (!voiceSession) {
    return { ok: false, reason: "voice_session_not_found" };
  }

  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId: voiceSession.guildId },
    include: {
      economy: { select: { currencyId: true } },
      voiceEarning: true,
    },
  });
  if (!config) return { ok: false, reason: "config_not_found" };
  if (getBirthday2026EventState(config, voiceSession.joinedAt) !== "open") {
    return { ok: false, reason: "event_not_open" };
  }
  if (!config.economy) {
    return { ok: false, reason: "economy_not_configured" };
  }
  if (!config.voiceEarning) {
    return { ok: false, reason: "voice_earning_not_configured" };
  }
  const currencyId = config.economy.currencyId;
  const voiceEarning = config.voiceEarning;

  const membership = await prisma.birthday2026MemberState.findUnique({
    where: {
      configId_userId: {
        configId: config.id,
        userId: voiceSession.userId,
      },
    },
    select: { joinedAt: true },
  });
  if (!membership) return { ok: false, reason: "member_not_found" };
  if (voiceSession.joinedAt < membership.joinedAt) {
    return { ok: false, reason: "activity_before_join" };
  }

  const eventDayIndex = getBirthday2026EventDayIndex(config, voiceSession.joinedAt);
  if (eventDayIndex === null) {
    return { ok: false, reason: "event_not_open" };
  }
  const dayStart = new Date(config.eventStartAt.getTime() + eventDayIndex * 86_400_000);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const eligibleTime = await prisma.voiceSessionTotal.aggregate({
    where: {
      isAlone: false,
      isDeafened: false,
      isMuted: false,
      voiceSession: {
        guildId: voiceSession.guildId,
        joinedAt: {
          gte: membership.joinedAt > dayStart ? membership.joinedAt : dayStart,
          lt: dayEnd,
        },
        userId: voiceSession.userId,
      },
    },
    _sum: { secondsSpent: true },
  });
  const eligibleSeconds = eligibleTime._sum.secondsSpent ?? 0;
  const targetUnits = Math.min(
    Math.floor(eligibleSeconds / voiceEarning.unitSeconds),
    voiceEarning.dailyCap,
  );
  const sourceKey = `voice-session:${voiceSession.id}`;

  return prisma.$transaction(async (tx) => {
    const state = await lockBirthday2026Config(tx, config.id);
    if (!state.enabled || state.settlement) {
      return { ok: false, reason: "event_not_open" };
    }
    await tx.birthday2026DailyVoiceEarning.upsert({
      where: {
        configId_userId_eventDayIndex: {
          configId: config.id,
          userId: voiceSession.userId,
          eventDayIndex,
        },
      },
      create: {
        configId: config.id,
        userId: voiceSession.userId,
        eventDayIndex,
        awardedUnits: 0,
      },
      update: { awardedUnits: { increment: 0 } },
    });

    let awardedUnits = 0;
    while (awardedUnits < targetUnits) {
      const update = await tx.birthday2026DailyVoiceEarning.updateMany({
        where: {
          configId: config.id,
          userId: voiceSession.userId,
          eventDayIndex,
          awardedUnits: { lt: targetUnits },
        },
        data: { awardedUnits: { increment: 1 } },
      });
      if (update.count === 0) break;
      awardedUnits += 1;
    }

    const dailyState = await tx.birthday2026DailyVoiceEarning.findUniqueOrThrow({
      where: {
        configId_userId_eventDayIndex: {
          configId: config.id,
          userId: voiceSession.userId,
          eventDayIndex,
        },
      },
      select: { awardedUnits: true },
    });

    if (awardedUnits === 0) {
      const wallet = await tx.wallet.findFirst({
        where: {
          currencyId,
          default: true,
          guildId: voiceSession.guildId,
          userId: voiceSession.userId,
        },
        select: { balance: true },
      });
      return {
        ok: true,
        awardedUnits: 0,
        dailyAwardedUnits: dailyState.awardedUnits,
        eligibleSeconds,
        eventDayIndex,
        status: "noop",
        walletBalance: wallet?.balance ?? 0,
      };
    }

    const wallet = await getDefaultWallet({
      prisma: nestedTransaction(tx),
      guildId: voiceSession.guildId,
      userId: voiceSession.userId,
      currencyId,
    });
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: awardedUnits } },
    });
    const transaction = await tx.transaction.create({
      data: {
        walletId: wallet.id,
        amount: awardedUnits,
        reason: `Birthday 2026 voice activity: day ${eventDayIndex}, session ${voiceSession.id}`,
        transactionType: "add",
        entryType: "credit",
        createdAt: voiceSession.leftAt,
      },
    });
    await tx.birthday2026PersonalTransaction.create({
      data: {
        configId: config.id,
        userId: voiceSession.userId,
        transactionId: transaction.id,
        source: "voiceActivity",
        sourceKey,
        createdAt: voiceSession.leftAt,
      },
    });

    return {
      ok: true,
      awardedUnits,
      dailyAwardedUnits: dailyState.awardedUnits,
      eligibleSeconds,
      eventDayIndex,
      status: "awarded",
      walletBalance: updatedWallet.balance,
    };
  });
};
