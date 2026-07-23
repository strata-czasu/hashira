import type {
  Birthday2026MemberState,
  Birthday2026TeamConfig,
  ExtendedPrismaClient,
  PrismaTransaction,
  Team,
} from "@hashira/db";
import { Prisma } from "@hashira/db";

export type Birthday2026TeamServiceErrorCode =
  | "captain_already_assigned"
  | "captain_move_requires_replacement"
  | "captain_not_member"
  | "config_not_found"
  | "invalid_activity_estimate"
  | "member_not_found"
  | "no_teams"
  | "team_not_found";

export class Birthday2026TeamServiceError extends Error {
  constructor(
    public readonly code: Birthday2026TeamServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "Birthday2026TeamServiceError";
  }
}

export type Birthday2026TeamWithDetails = Birthday2026TeamConfig & {
  team: Team;
  _count: { memberStates: number };
};

export type TeamAllocationCandidate = {
  teamConfigId: number;
  projectedActivity: number;
  memberCount: number;
};

export type MemberAllocationCandidate = {
  userId: string;
  activityEstimate: number;
  fixedTeamConfigId?: number;
};

export type PlannedAssignment = {
  userId: string;
  teamConfigId: number;
  activityEstimate: number;
};

export type TeamAllocationPlan = {
  assignments: PlannedAssignment[];
  teams: TeamAllocationCandidate[];
};

const normalizeEstimate = (estimate: number): number => {
  if (!Number.isFinite(estimate) || estimate < 0) {
    throw new Birthday2026TeamServiceError(
      "invalid_activity_estimate",
      `Invalid activity estimate: ${estimate}`,
    );
  }
  return estimate;
};

const pickLowestProjectedTeam = (
  teams: TeamAllocationCandidate[],
  random: () => number,
): TeamAllocationCandidate => {
  if (teams.length === 0) {
    throw new Birthday2026TeamServiceError(
      "no_teams",
      "Birthday 2026 has no configured teams",
    );
  }

  const minimumActivity = Math.min(...teams.map((team) => team.projectedActivity));
  const activityCandidates = teams.filter(
    (team) => team.projectedActivity === minimumActivity,
  );
  const minimumMembers = Math.min(
    ...activityCandidates.map((team) => team.memberCount),
  );
  const candidates = activityCandidates.filter(
    (team) => team.memberCount === minimumMembers,
  );
  const index = Math.min(
    Math.floor(random() * candidates.length),
    candidates.length - 1,
  );
  const selected = candidates[index];
  if (!selected) {
    throw new Birthday2026TeamServiceError(
      "no_teams",
      "Birthday 2026 has no allocatable teams",
    );
  }
  return selected;
};

export const planBirthday2026TeamAssignments = (
  teamConfigIds: number[],
  members: MemberAllocationCandidate[],
  random: () => number = Math.random,
): TeamAllocationPlan => {
  const uniqueTeamIds = new Set(teamConfigIds);
  if (uniqueTeamIds.size !== teamConfigIds.length) {
    throw new Error("Duplicate Birthday 2026 team configuration IDs");
  }

  const teams = teamConfigIds.map((teamConfigId) => ({
    teamConfigId,
    projectedActivity: 0,
    memberCount: 0,
  }));
  if (teams.length === 0) {
    throw new Birthday2026TeamServiceError(
      "no_teams",
      "Birthday 2026 has no configured teams",
    );
  }

  const seenUsers = new Set<string>();
  const normalizedMembers = members.map((member) => {
    if (seenUsers.has(member.userId)) {
      throw new Error(`Duplicate Birthday 2026 member: ${member.userId}`);
    }
    seenUsers.add(member.userId);
    return {
      ...member,
      activityEstimate: normalizeEstimate(member.activityEstimate),
    };
  });

  const assignments: PlannedAssignment[] = [];
  const assign = (
    member: (typeof normalizedMembers)[number],
    team: TeamAllocationCandidate,
  ) => {
    team.projectedActivity += member.activityEstimate;
    team.memberCount += 1;
    assignments.push({
      userId: member.userId,
      teamConfigId: team.teamConfigId,
      activityEstimate: member.activityEstimate,
    });
  };

  for (const member of normalizedMembers) {
    if (member.fixedTeamConfigId === undefined) continue;
    const team = teams.find(
      (candidate) => candidate.teamConfigId === member.fixedTeamConfigId,
    );
    if (!team) {
      throw new Birthday2026TeamServiceError(
        "team_not_found",
        `Fixed team ${member.fixedTeamConfigId} is not configured`,
      );
    }
    assign(member, team);
  }

  const movableMembers = normalizedMembers
    .filter((member) => member.fixedTeamConfigId === undefined)
    .sort(
      (a, b) =>
        b.activityEstimate - a.activityEstimate || a.userId.localeCompare(b.userId),
    );

  for (const member of movableMembers) {
    assign(member, pickLowestProjectedTeam(teams, random));
  }

  return {
    assignments,
    teams: [...teams].sort((a, b) => a.teamConfigId - b.teamConfigId),
  };
};

export const findBirthday2026Teams = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Birthday2026TeamWithDetails[]> => {
  const teams = await prisma.birthday2026TeamConfig.findMany({
    where: { config: { guildId } },
    include: {
      team: true,
      _count: { select: { memberStates: true } },
    },
    orderBy: { id: "asc" },
  });
  return teams;
};

export const findBirthday2026Membership = (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
) =>
  prisma.birthday2026MemberState.findFirst({
    where: { userId, teamConfig: { config: { guildId } } },
    include: { teamConfig: { include: { team: true } } },
  });

export type CreateBirthday2026TeamInput = {
  guildId: string;
  name: string;
  roleId: string;
  color: number;
};

export const createBirthday2026Team = (
  prisma: ExtendedPrismaClient,
  input: CreateBirthday2026TeamInput,
) =>
  prisma.$transaction(async (tx) => {
    const config = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      select: { id: true },
    });
    if (!config) {
      throw new Birthday2026TeamServiceError(
        "config_not_found",
        `Birthday 2026 is not configured for guild ${input.guildId}`,
      );
    }

    return tx.birthday2026TeamConfig.create({
      data: {
        roleId: input.roleId,
        color: input.color,
        config: { connect: { id: config.id } },
        team: {
          create: {
            guildId: input.guildId,
            name: input.name,
          },
        },
      },
      include: { team: true },
    });
  });

export type AssignBirthday2026MemberInput = {
  guildId: string;
  teamConfigId: number;
  userId: string;
};

export const assignBirthday2026Member = (
  prisma: ExtendedPrismaClient,
  input: AssignBirthday2026MemberInput,
) =>
  prisma.$transaction(async (tx) => {
    const teamConfig = await tx.birthday2026TeamConfig.findFirst({
      where: { id: input.teamConfigId, config: { guildId: input.guildId } },
      select: { configId: true },
    });
    if (!teamConfig) {
      throw new Birthday2026TeamServiceError(
        "team_not_found",
        `Birthday 2026 team ${input.teamConfigId} was not found`,
      );
    }

    const existing = await tx.birthday2026MemberState.findUnique({
      where: {
        configId_userId: {
          configId: teamConfig.configId,
          userId: input.userId,
        },
      },
      include: { teamConfig: { select: { captainUserId: true } } },
    });
    if (
      existing &&
      existing.teamConfigId !== input.teamConfigId &&
      existing.teamConfig.captainUserId === input.userId
    ) {
      throw new Birthday2026TeamServiceError(
        "captain_move_requires_replacement",
        `Captain ${input.userId} must be replaced before changing teams`,
      );
    }

    const member = await tx.birthday2026MemberState.upsert({
      where: {
        configId_userId: {
          configId: teamConfig.configId,
          userId: input.userId,
        },
      },
      create: {
        configId: teamConfig.configId,
        teamConfigId: input.teamConfigId,
        userId: input.userId,
      },
      update: { teamConfigId: input.teamConfigId },
    });

    return {
      member,
      previousTeamConfigId: existing?.teamConfigId ?? null,
    };
  });

export const removeBirthday2026Member = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
): Promise<Birthday2026MemberState> => {
  const member = await findBirthday2026Membership(prisma, guildId, userId);
  if (!member) {
    throw new Birthday2026TeamServiceError(
      "member_not_found",
      `User ${userId} is not a Birthday 2026 member`,
    );
  }
  if (member.teamConfig.captainUserId === userId) {
    throw new Birthday2026TeamServiceError(
      "captain_move_requires_replacement",
      `Captain ${userId} must be replaced before leaving their team`,
    );
  }
  return prisma.birthday2026MemberState.delete({ where: { id: member.id } });
};

export const setBirthday2026Captain = (
  prisma: ExtendedPrismaClient,
  guildId: string,
  teamConfigId: number,
  userId: string | null,
) =>
  prisma.$transaction(async (tx) => {
    const teamConfig = await tx.birthday2026TeamConfig.findFirst({
      where: { id: teamConfigId, config: { guildId } },
      select: { id: true, configId: true },
    });
    if (!teamConfig) {
      throw new Birthday2026TeamServiceError(
        "team_not_found",
        `Birthday 2026 team ${teamConfigId} was not found`,
      );
    }

    if (userId) {
      const membership = await tx.birthday2026MemberState.findUnique({
        where: {
          configId_userId: {
            configId: teamConfig.configId,
            userId,
          },
        },
      });
      if (!membership || membership.teamConfigId !== teamConfig.id) {
        throw new Birthday2026TeamServiceError(
          "captain_not_member",
          `Captain ${userId} must belong to team ${teamConfigId}`,
        );
      }

      const existingCaptaincy = await tx.birthday2026TeamConfig.findFirst({
        where: {
          configId: teamConfig.configId,
          captainUserId: userId,
          id: { not: teamConfig.id },
        },
        select: { id: true },
      });
      if (existingCaptaincy) {
        throw new Birthday2026TeamServiceError(
          "captain_already_assigned",
          `Captain ${userId} already leads another Birthday 2026 team`,
        );
      }
    }

    return tx.birthday2026TeamConfig.update({
      where: { id: teamConfig.id },
      data: { captainUserId: userId },
    });
  });

export type RebalanceBirthday2026MembersInput = {
  guildId: string;
  activityEstimates: ReadonlyMap<string, number>;
  random?: () => number;
};

export const rebalanceBirthday2026Members = (
  prisma: ExtendedPrismaClient,
  input: RebalanceBirthday2026MembersInput,
): Promise<TeamAllocationPlan> =>
  prisma.$transaction(async (tx) => {
    const config = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      include: {
        teams: {
          include: { memberStates: true },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!config) {
      throw new Birthday2026TeamServiceError(
        "config_not_found",
        `Birthday 2026 is not configured for guild ${input.guildId}`,
      );
    }

    const members = config.teams.flatMap((team) =>
      team.memberStates.map((member) => ({
        userId: member.userId,
        activityEstimate: input.activityEstimates.get(member.userId) ?? 0,
        ...(team.captainUserId === member.userId ? { fixedTeamConfigId: team.id } : {}),
      })),
    );

    for (const team of config.teams) {
      if (
        team.captainUserId &&
        !team.memberStates.some((member) => member.userId === team.captainUserId)
      ) {
        throw new Birthday2026TeamServiceError(
          "captain_not_member",
          `Captain ${team.captainUserId} does not belong to team ${team.id}`,
        );
      }
    }

    const plan = planBirthday2026TeamAssignments(
      config.teams.map((team) => team.id),
      members,
      input.random,
    );

    await Promise.all(
      plan.assignments.map((assignment) =>
        tx.birthday2026MemberState.update({
          where: {
            configId_userId: {
              configId: config.id,
              userId: assignment.userId,
            },
          },
          data: { teamConfigId: assignment.teamConfigId },
        }),
      ),
    );

    return plan;
  });

export const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
