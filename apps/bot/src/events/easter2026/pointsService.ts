import type { PrismaTransaction } from "@hashira/db";
import { Prisma } from "@hashira/db";

// Types

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

// ─── Raw SQL queries ─────────────────────────────────────────────────────────

/**
 * Get total capped points for a team, computed entirely in SQL.
 *
 * This does the same as getTeamActivity from Easter 2025
 * but adds daily-per-user capping and bonus channel weighting:
 *
 * 1. JOIN TeamMember → userTextActivity  (only from joinedAt, excluding disabled channels)
 * 2. LEFT JOIN bonus channels to get per-message weight  (1 or multiplier)
 * 3. GROUP BY userId, day  → sum weighted messages
 * 4. LEAST(sum, dailyCap) per user-day  → capped
 * 5. Re-group by userId  → per-user total
 *
 * Returns one row per user, ordered by total points descending.
 * This avoids pulling per-day rows into the application.
 */
export const getTeamPointsByUser = async (
  prisma: PrismaTransaction,
  teamId: number,
  since: Date,
  until: Date,
  dailyCap: number,
  disabledChannelIds: string[],
  bonusChannels: BonusChannelInfo[],
): Promise<UserPoints[]> => {
  // Build the disabled channels filter.
  // NOT EXISTS is fast because the DB can do an anti-semi-join with an index scan,
  // same approach as Easter 2025.
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

  // For bonus channel weighting, we build a VALUES list and LEFT JOIN it.
  // Each bonus channel entry maps (channelId, date) → multiplier.
  // Messages not on a bonus channel get weight 1.
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

  const results = await prisma.$queryRaw<{ userId: string; totalPoints: number }[]>`
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
    totalPoints: r.totalPoints,
  }));
};

/**
 * Get total points for a team (single number).
 * Wraps getTeamPointsByUser and sums across all users.
 */
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
