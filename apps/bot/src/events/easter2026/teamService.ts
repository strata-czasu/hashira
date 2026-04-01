import type {
  Easter2026TeamConfig,
  PrismaTransaction,
  Team,
  TeamMember,
} from "@hashira/db";

export type TeamWithConfig = Team & {
  easter2026TeamConfig: Easter2026TeamConfig;
  _count: { members: number };
};

export type JoinResult =
  | { ok: true; team: TeamWithConfig; member: TeamMember }
  | { ok: false; reason: "already_in_team"; team: TeamWithConfig }
  | { ok: false; reason: "no_teams" };

export type RemoveResult =
  | { ok: true; team: TeamWithConfig }
  | { ok: false; reason: "not_in_team" };

export type MoveResult =
  | {
      ok: true;
      previousTeam: TeamWithConfig | null;
      team: TeamWithConfig;
      member: TeamMember;
    }
  | { ok: false; reason: "already_in_team"; team: TeamWithConfig }
  | { ok: false; reason: "team_not_found" };

export const findEaster2026Teams = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<TeamWithConfig[]> => {
  const configs = await prisma.easter2026TeamConfig.findMany({
    where: { team: { guildId } },
    include: {
      team: {
        include: { _count: { select: { members: true } } },
      },
    },
  });

  return configs.map((c) => ({
    ...c.team,
    easter2026TeamConfig: c,
    _count: c.team._count,
  }));
};

export const findMembershipForEaster2026 = async (
  prisma: PrismaTransaction,
  userId: string,
  guildId: string,
): Promise<(TeamMember & { team: TeamWithConfig }) | null> => {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: {
        guildId,
        easter2026TeamConfig: { isNot: null },
      },
    },
    include: {
      team: {
        include: {
          easter2026TeamConfig: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!membership || !membership.team.easter2026TeamConfig) return null;

  return {
    ...membership,
    team: {
      ...membership.team,
      easter2026TeamConfig: membership.team.easter2026TeamConfig,
      _count: membership.team._count,
    },
  };
};

export const pickLeastPopulatedTeam = (
  teams: TeamWithConfig[],
  random: () => number,
): TeamWithConfig | undefined => {
  if (teams.length === 0) return undefined;

  const minCount = Math.min(...teams.map((t) => t._count.members));
  const candidates = teams.filter((t) => t._count.members === minCount);

  return candidates[Math.floor(random() * candidates.length)];
};

export const joinRandomTeam = async (
  prisma: PrismaTransaction,
  userId: string,
  guildId: string,
): Promise<JoinResult> => {
  const existing = await findMembershipForEaster2026(prisma, userId, guildId);
  if (existing) return { ok: false, team: existing.team, reason: "already_in_team" };

  const teams = await findEaster2026Teams(prisma, guildId);
  const team = pickLeastPopulatedTeam(teams, Math.random);
  if (!team) return { ok: false, reason: "no_teams" };

  const member = await prisma.teamMember.create({
    data: { teamId: team.id, userId },
  });

  return { ok: true, team, member };
};

export const moveToTeam = async (
  prisma: PrismaTransaction,
  userId: string,
  targetTeamId: number,
  guildId: string,
): Promise<MoveResult> => {
  const teams = await findEaster2026Teams(prisma, guildId);
  const targetTeam = teams.find((t) => t.id === targetTeamId);

  if (!targetTeam) return { ok: false, reason: "team_not_found" };

  const existing = await findMembershipForEaster2026(prisma, userId, guildId);

  if (existing) {
    if (existing.team.id === targetTeamId) {
      return { ok: false, reason: "already_in_team", team: existing.team };
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId: existing.team.id, userId } },
    });
  }

  const member = await prisma.teamMember.create({
    data: { teamId: targetTeam.id, userId },
  });

  return { ok: true, previousTeam: existing?.team ?? null, team: targetTeam, member };
};

export const removeFromTeam = async (
  prisma: PrismaTransaction,
  userId: string,
  guildId: string,
): Promise<RemoveResult> => {
  const existing = await findMembershipForEaster2026(prisma, userId, guildId);
  if (!existing) return { ok: false, reason: "not_in_team" };

  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId: existing.team.id, userId } },
  });

  return { ok: true, team: existing.team };
};

export const setCaptain = async (
  prisma: PrismaTransaction,
  teamConfigId: number,
  userId: string | null,
): Promise<void> => {
  await prisma.easter2026TeamConfig.update({
    where: { id: teamConfigId },
    data: { captainUserId: userId },
  });
};
