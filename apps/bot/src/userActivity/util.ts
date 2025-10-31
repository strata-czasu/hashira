import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";

/**
 * Get an user's guild text activity count in messages
 */
export const getUserTextActivity = async ({
  prisma,
  guildId,
  userId,
  since,
  to,
}: {
  prisma: ExtendedPrismaClient;
  guildId: string;
  userId: string;
  since: Date;
  to?: Date;
}) => {
  return prisma.userTextActivity.count({
    where: {
      userId,
      guildId,
      timestamp: {
        gte: since,
        ...(to ? { lte: to } : {}),
      },
    },
  });
};

export const getUsersTextActivity = async ({
  prisma,
  guildId,
  userIds,
  since,
  to,
}: {
  prisma: ExtendedPrismaClient | PrismaTransaction;
  guildId: string;
  userIds: string[];
  since: Date;
  to?: Date;
}): Promise<Map<string, number>> => {
  if (userIds.length === 0) {
    return new Map();
  }

  // Get text activity counts
  const textActivityCounts = await prisma.userTextActivity.groupBy({
    by: ["userId"],
    where: {
      userId: { in: userIds },
      guildId,
      timestamp: { gte: since, ...(to ? { lte: to } : {}) },
    },
    _count: { id: true },
  });

  const textActivityMap = new Map(
    textActivityCounts.map((item) => [item.userId, item._count.id]),
  );

  return textActivityMap;
};

/**
 * Get an user's guild voice activity in seconds
 */
export const getUserVoiceActivity = async ({
  prisma,
  guildId,
  userId,
  since,
  to,
}: {
  prisma: ExtendedPrismaClient;
  guildId: string;
  userId: string;
  since: Date;
  to?: Date;
}) => {
  const {
    _sum: { secondsSpent },
  } = await prisma.voiceSessionTotal.aggregate({
    _sum: {
      secondsSpent: true,
    },
    where: {
      isMuted: false,
      isDeafened: false,
      isAlone: false,
      voiceSession: {
        guildId,
        userId,
        joinedAt: {
          gte: since,
          ...(to ? { lte: to } : {}),
        },
      },
    },
  });
  return secondsSpent ?? 0;
};

/**
 * Get multiple users' guild voice activity in seconds (batched)
 * Returns a Map of userId -> seconds spent
 */
export const getUsersVoiceActivity = async ({
  prisma,
  guildId,
  userIds,
  since,
  to,
}: {
  prisma: ExtendedPrismaClient | PrismaTransaction;
  guildId: string;
  userIds: string[];
  since: Date;
  to?: Date;
}): Promise<Map<string, number>> => {
  if (userIds.length === 0) return new Map();

  const results = await prisma.$queryRaw<
    Array<{ userId: string; totalSeconds: bigint }>
  >`
    SELECT 
      vs."userId",
      COALESCE(SUM(vst."secondsSpent"), 0)::bigint as "totalSeconds"
    FROM "VoiceSession" vs
    LEFT JOIN "VoiceSessionTotal" vst ON vst."voiceSessionId" = vs.id
      AND vst."isMuted" = false
      AND vst."isDeafened" = false
      AND vst."isAlone" = false
    WHERE vs."userId" = ANY(${userIds})
      AND vs."guildId" = ${guildId}
      AND vs."joinedAt" >= ${since}
      AND (${to}::timestamp IS NULL OR vs."joinedAt" <= ${to})
    GROUP BY vs."userId"
  `;

  return new Map(results.map((row) => [row.userId, Number(row.totalSeconds)]));
};
