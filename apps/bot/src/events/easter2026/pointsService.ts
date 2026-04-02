import type { PrismaTransaction } from "@hashira/db";
import { Prisma } from "@hashira/db";

export type DailyActivity = {
  userId: string;
  day: Date;
  rawCount: number;
  weightedCount: number;
};

export type UserPoints = {
  userId: string;
  totalPoints: number;
};

export type TeamRankingEntry = {
  teamId: number;
  teamName: string;
  totalPoints: number;
};

export type BonusChannelInfo = {
  channelId: string;
  date: Date;
  multiplier: number;
};

export const getTeamPointsByUser = async (
  prisma: PrismaTransaction,
  teamId: number,
  since: Date,
  until: Date,
  dailyCap: number,
  disabledChannelIds: string[],
  bonusChannels: BonusChannelInfo[],
): Promise<UserPoints[]> => {
  const disabledFilter =
    disabledChannelIds.length > 0
      ? Prisma.sql`
          AND NOT EXISTS (
            SELECT 1
            FROM "Easter2026DisabledChannel" dc
            JOIN "Easter2026Config" ec ON ec."id" = dc."configId"
            WHERE dc."channelId" = uta."channelId"
              AND ec."guildId" = (SELECT "guildId" FROM "Team" WHERE "id" = ${teamId})
          )`
      : Prisma.empty;

  let bonusJoin: Prisma.Sql;
  let weightExpr: Prisma.Sql;

  if (bonusChannels.length > 0) {
    const bonusValues = Prisma.join(
      bonusChannels.map(
        (bc) =>
          Prisma.sql`(${bc.channelId}::text, ${bc.date}::date, ${bc.multiplier}::double precision)`,
      ),
    );

    bonusJoin = Prisma.sql`
      LEFT JOIN (VALUES ${bonusValues}) AS bonus("channelId", "date", "multiplier")
        ON bonus."channelId" = uta."channelId"
        AND bonus."date" = DATE(uta."timestamp")`;
    weightExpr = Prisma.sql`COALESCE(bonus."multiplier", 1)`;
  } else {
    bonusJoin = Prisma.empty;
    weightExpr = Prisma.sql`1`;
  }

  const results = await prisma.$queryRaw<{ userId: string; totalPoints: string }[]>`
    SELECT
      sub."userId",
      SUM(sub.capped_weighted) AS "totalPoints"
    FROM (
      SELECT
        tm."userId",
        DATE(uta."timestamp") AS day,
        LEAST(
          SUM(${weightExpr}),
          ${dailyCap}
        ) AS capped_weighted
      FROM "TeamMember" tm
      JOIN "userTextActivity" uta
        ON uta."userId" = tm."userId"
        AND uta."timestamp" >= tm."joinedAt"
        AND uta."timestamp" >= ${since}
        AND uta."timestamp" <= ${until}
        AND uta."guildId" = (SELECT "guildId" FROM "Team" WHERE "id" = ${teamId})
      ${bonusJoin}
      WHERE
        tm."teamId" = ${teamId}
        ${disabledFilter}
      GROUP BY tm."userId", DATE(uta."timestamp")
    ) sub
    GROUP BY sub."userId"
    ORDER BY "totalPoints" DESC;
  `;

  return results.map((r) => ({
    userId: r.userId,
    totalPoints: Number(r.totalPoints),
  }));
};

export const getTeamTotalPoints = async (
  prisma: PrismaTransaction,
  teamId: number,
  since: Date,
  until: Date,
  dailyCap: number,
  disabledChannelIds: string[],
  bonusChannels: BonusChannelInfo[],
): Promise<number> => {
  const userPoints = await getTeamPointsByUser(
    prisma,
    teamId,
    since,
    until,
    dailyCap,
    disabledChannelIds,
    bonusChannels,
  );

  return userPoints.reduce((sum, u) => sum + u.totalPoints, 0);
};

export const applyCap = (
  activities: DailyActivity[],
  dailyCap: number,
): UserPoints[] => {
  const userTotals = new Map<string, number>();

  for (const activity of activities) {
    const capped = Math.min(activity.weightedCount, dailyCap);
    const current = userTotals.get(activity.userId) ?? 0;
    userTotals.set(activity.userId, current + capped);
  }

  return Array.from(userTotals.entries())
    .map(([userId, totalPoints]) => ({ userId, totalPoints }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
};

export const sumWithCap = (activities: DailyActivity[], dailyCap: number): number => {
  let total = 0;

  for (const activity of activities) {
    total += Math.min(activity.weightedCount, dailyCap);
  }

  return total;
};
