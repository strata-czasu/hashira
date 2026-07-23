import type {
  Birthday2026MemberState,
  Birthday2026TeamConfig,
  ExtendedPrismaClient,
  PrismaTransaction,
  Team,
} from "@hashira/db";

export type Birthday2026TeamErrorReason =
  | "already_in_team"
  | "captain_already_assigned"
  | "captain_move_requires_replacement"
  | "captain_not_member"
  | "config_not_found"
  | "invalid_activity_estimate"
  | "member_not_found"
  | "no_teams"
  | "role_already_used"
  | "team_already_exists"
  | "team_not_found";

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

const pickLowestProjectedTeam = (
  teams: TeamAllocationCandidate[],
  random: () => number,
): TeamAllocationCandidate => {
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
  const selected =
    candidates[
      Math.min(Math.floor(random() * candidates.length), candidates.length - 1)
    ];

  if (!selected) throw new Error("Cannot allocate a member without a team");
  return selected;
};

export const planBirthday2026TeamAssignments = (
  teamConfigIds: number[],
  members: MemberAllocationCandidate[],
  random: () => number,
): TeamAllocationPlan => {
  if (teamConfigIds.length === 0) {
    throw new Error("Cannot plan Birthday 2026 assignments without teams");
  }
  if (new Set(teamConfigIds).size !== teamConfigIds.length) {
    throw new Error("Duplicate Birthday 2026 team configuration IDs");
  }

  const seenUsers = new Set<string>();
  for (const member of members) {
    if (seenUsers.has(member.userId)) {
      throw new Error(`Duplicate Birthday 2026 member: ${member.userId}`);
    }
    if (!Number.isFinite(member.activityEstimate) || member.activityEstimate < 0) {
      throw new Error(`Invalid activity estimate: ${member.activityEstimate}`);
    }
    seenUsers.add(member.userId);
  }

  const teams = teamConfigIds.map((teamConfigId) => ({
    teamConfigId,
    projectedActivity: 0,
    memberCount: 0,
  }));
  const assignments: PlannedAssignment[] = [];

  const assign = (member: MemberAllocationCandidate, team: TeamAllocationCandidate) => {
    team.projectedActivity += member.activityEstimate;
    team.memberCount += 1;
    assignments.push({
      userId: member.userId,
      teamConfigId: team.teamConfigId,
      activityEstimate: member.activityEstimate,
    });
  };

  for (const member of members) {
    if (member.fixedTeamConfigId === undefined) continue;
    const team = teams.find(
      (candidate) => candidate.teamConfigId === member.fixedTeamConfigId,
    );
    if (!team) {
      throw new Error(`Unknown fixed team: ${member.fixedTeamConfigId}`);
    }
    assign(member, team);
  }

  const movableMembers = members
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

export const findBirthday2026Teams = (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Birthday2026TeamWithDetails[]> =>
  prisma.birthday2026TeamConfig.findMany({
    where: { config: { guildId } },
    include: {
      team: true,
      _count: { select: { memberStates: true } },
    },
    orderBy: { id: "asc" },
  });

export const findBirthday2026Membership = (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
) =>
  prisma.birthday2026MemberState.findFirst({
    where: { userId, teamConfig: { config: { guildId } } },
    include: { teamConfig: { include: { team: true } } },
  });

export type CreateBirthday2026TeamResult =
  | {
      ok: true;
      team: Birthday2026TeamConfig & { team: Team };
    }
  | {
      ok: false;
      reason: "config_not_found" | "role_already_used" | "team_already_exists";
    };

export const createBirthday2026Team = (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    name: string;
    roleId: string;
    color: number;
  },
): Promise<CreateBirthday2026TeamResult> =>
  prisma.$transaction(async (tx) => {
    const config = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      select: { id: true },
    });
    if (!config) return { ok: false, reason: "config_not_found" };

    const [existingRole, existingTeam] = await Promise.all([
      tx.birthday2026TeamConfig.findUnique({
        where: { roleId: input.roleId },
        select: { id: true },
      }),
      tx.team.findFirst({
        where: { guildId: input.guildId, name: input.name },
        select: { id: true },
      }),
    ]);
    if (existingRole) return { ok: false, reason: "role_already_used" };
    if (existingTeam) return { ok: false, reason: "team_already_exists" };

    const team = await tx.birthday2026TeamConfig.create({
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

    return { ok: true, team };
  });

export type AssignBirthday2026MemberResult =
  | {
      ok: true;
      member: Birthday2026MemberState;
      previousTeamConfigId: number | null;
    }
  | {
      ok: false;
      reason:
        | "already_in_team"
        | "captain_move_requires_replacement"
        | "team_not_found";
    };

export const assignBirthday2026Member = (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    teamConfigId: number;
    userId: string;
  },
): Promise<AssignBirthday2026MemberResult> =>
  prisma.$transaction(async (tx) => {
    const teamConfig = await tx.birthday2026TeamConfig.findFirst({
      where: { id: input.teamConfigId, config: { guildId: input.guildId } },
      select: { configId: true },
    });
    if (!teamConfig) return { ok: false, reason: "team_not_found" };

    const existing = await tx.birthday2026MemberState.findUnique({
      where: {
        configId_userId: {
          configId: teamConfig.configId,
          userId: input.userId,
        },
      },
      include: { teamConfig: { select: { captainUserId: true } } },
    });
    if (existing?.teamConfigId === input.teamConfigId) {
      return { ok: false, reason: "already_in_team" };
    }
    if (existing?.teamConfig.captainUserId === input.userId) {
      return { ok: false, reason: "captain_move_requires_replacement" };
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
      ok: true,
      member,
      previousTeamConfigId: existing?.teamConfigId ?? null,
    };
  });

export type RemoveBirthday2026MemberResult =
  | { ok: true; member: Birthday2026MemberState }
  | {
      ok: false;
      reason: "captain_move_requires_replacement" | "member_not_found";
    };

export const removeBirthday2026Member = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
): Promise<RemoveBirthday2026MemberResult> => {
  const member = await findBirthday2026Membership(prisma, guildId, userId);
  if (!member) return { ok: false, reason: "member_not_found" };
  if (member.teamConfig.captainUserId === userId) {
    return { ok: false, reason: "captain_move_requires_replacement" };
  }

  return {
    ok: true,
    member: await prisma.birthday2026MemberState.delete({
      where: { id: member.id },
    }),
  };
};

export type SetBirthday2026CaptainResult =
  | { ok: true; team: Birthday2026TeamConfig }
  | {
      ok: false;
      reason: "captain_already_assigned" | "captain_not_member" | "team_not_found";
    };

export const setBirthday2026Captain = (
  prisma: ExtendedPrismaClient,
  guildId: string,
  teamConfigId: number,
  userId: string | null,
): Promise<SetBirthday2026CaptainResult> =>
  prisma.$transaction(async (tx) => {
    const teamConfig = await tx.birthday2026TeamConfig.findFirst({
      where: { id: teamConfigId, config: { guildId } },
      select: { id: true, configId: true },
    });
    if (!teamConfig) return { ok: false, reason: "team_not_found" };

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
        return { ok: false, reason: "captain_not_member" };
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
        return { ok: false, reason: "captain_already_assigned" };
      }
    }

    const team = await tx.birthday2026TeamConfig.update({
      where: { id: teamConfig.id },
      data: { captainUserId: userId },
    });
    return { ok: true, team };
  });

export type RebalanceBirthday2026MembersResult =
  | { ok: true; plan: TeamAllocationPlan }
  | {
      ok: false;
      reason:
        | "captain_not_member"
        | "config_not_found"
        | "invalid_activity_estimate"
        | "no_teams";
    };

export const rebalanceBirthday2026Members = (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    activityEstimates: ReadonlyMap<string, number>;
    random: () => number;
  },
): Promise<RebalanceBirthday2026MembersResult> =>
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
    if (!config) return { ok: false, reason: "config_not_found" };
    if (config.teams.length === 0) return { ok: false, reason: "no_teams" };

    const members: MemberAllocationCandidate[] = [];
    for (const team of config.teams) {
      for (const member of team.memberStates) {
        const activityEstimate = input.activityEstimates.get(member.userId);
        if (
          activityEstimate === undefined ||
          !Number.isFinite(activityEstimate) ||
          activityEstimate < 0
        ) {
          return { ok: false, reason: "invalid_activity_estimate" };
        }
        members.push({
          userId: member.userId,
          activityEstimate,
          ...(team.captainUserId === member.userId
            ? { fixedTeamConfigId: team.id }
            : {}),
        });
      }
    }
    for (const team of config.teams) {
      if (
        team.captainUserId &&
        !team.memberStates.some((member) => member.userId === team.captainUserId)
      ) {
        return { ok: false, reason: "captain_not_member" };
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

    return { ok: true, plan };
  });
