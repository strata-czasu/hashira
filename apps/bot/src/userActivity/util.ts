import type { ExtendedPrismaClient } from "@hashira/db";

/**
 * Get an user's guild text activity count in messages
 */
export const getUserTextActivity = async ({
  prisma,
  guildId,
  userId,
  since,
}: {
  prisma: ExtendedPrismaClient;
  guildId: string;
  userId: string;
  since: Date;
}) => {
  return prisma.userTextActivity.count({
    where: {
      userId,
      guildId,
      timestamp: {
        gte: since,
      },
    },
  });
};

/**
 * Get an user's guild voice activity in seconds
 */
export const getUserVoiceActivity = async ({
  prisma,
  guildId,
  userId,
  since,
}: {
  prisma: ExtendedPrismaClient;
  guildId: string;
  userId: string;
  since: Date;
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
        },
      },
    },
  });
  return secondsSpent ?? 0;
};
