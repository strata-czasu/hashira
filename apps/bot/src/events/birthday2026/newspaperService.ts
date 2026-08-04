import type { PrismaTransaction } from "@hashira/db";
import { getBirthday2026EventDayIndex } from "./eventState";

export const getBirthday2026Newspaper = async (
  prisma: PrismaTransaction,
  guildId: string,
  now: Date,
) => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    include: {
      teams: {
        select: {
          id: true,
          roleId: true,
          wallet: { select: { permanentWeight: true } },
        },
      },
    },
  });
  if (!config) return null;
  if (config.teams.some((team) => !team.wallet)) {
    throw new Error("Birthday 2026 team wallets are not configured");
  }
  const dayIndex = getBirthday2026EventDayIndex(config, now);
  const lastDay = Math.max(
    0,
    Math.ceil(
      (config.eventEndAt.getTime() - config.eventStartAt.getTime()) / 86_400_000,
    ) - 1,
  );
  const effectiveDay = dayIndex ?? (now < config.eventStartAt ? 0 : lastDay);
  const dayStart = new Date(config.eventStartAt.getTime() + effectiveDay * 86_400_000);
  const dayEnd = new Date(
    Math.min(dayStart.getTime() + 86_400_000, config.eventEndAt.getTime()),
  );
  const [feeds, encounters, activations, milestones] = await Promise.all([
    prisma.birthday2026FeedBatch.groupBy({
      by: ["userId"],
      where: { configId: config.id, createdAt: { gte: dayStart, lt: dayEnd } },
      _sum: { amount: true },
    }),
    prisma.birthday2026Encounter.count({
      where: { configId: config.id, startsAt: { gte: dayStart, lt: dayEnd } },
    }),
    prisma.birthday2026PowerupActivation.count({
      where: { configId: config.id, activatedAt: { gte: dayStart, lt: dayEnd } },
    }),
    prisma.birthday2026TeamMilestone.count({
      where: {
        teamConfig: { configId: config.id },
        completedAt: { gte: dayStart, lt: dayEnd },
      },
    }),
  ]);
  const topFeed = Math.max(0, ...feeds.map((feed) => feed._sum.amount ?? 0));

  return {
    day: effectiveDay + 1,
    encounters,
    activations,
    milestones,
    totalFed: feeds.reduce((total, feed) => total + (feed._sum.amount ?? 0), 0),
    topFeeders: feeds
      .filter((feed) => (feed._sum.amount ?? 0) === topFeed && topFeed > 0)
      .map((feed) => ({ userId: feed.userId, amount: topFeed })),
    teams: config.teams
      .map((team) => {
        if (!team.wallet) {
          throw new Error("Birthday 2026 team wallet disappeared during the query");
        }
        return {
          roleId: team.roleId,
          permanentWeight: team.wallet.permanentWeight,
        };
      })
      .sort((a, b) => b.permanentWeight - a.permanentWeight),
  };
};
