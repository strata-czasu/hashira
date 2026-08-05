import {
  type ExtendedPrismaClient,
  isUniqueConstraintError,
  type PrismaTransaction,
} from "@hashira/db";

type TeamAllocationCandidate = {
  teamConfigId: number;
  projectedActivity: number;
  memberCount: number;
};

type MemberAllocationCandidate = {
  userId: string;
  activityEstimate: number;
  fixedTeamConfigId?: number;
};

type PlannedAssignment = {
  userId: string;
  teamConfigId: number;
  activityEstimate: number;
};

type AllocationState = {
  teams: TeamAllocationCandidate[];
  assignments: PlannedAssignment[];
};

const pickLowestProjectedTeam = (
  teams: TeamAllocationCandidate[],
  random: () => number,
): number => {
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
  return selected.teamConfigId;
};

const assignMember = (
  state: AllocationState,
  member: MemberAllocationCandidate,
  teamConfigId: number,
): AllocationState => {
  const team = state.teams.find((candidate) => candidate.teamConfigId === teamConfigId);
  if (!team) throw new Error(`Unknown team: ${teamConfigId}`);

  return {
    assignments: [
      ...state.assignments,
      {
        userId: member.userId,
        teamConfigId,
        activityEstimate: member.activityEstimate,
      },
    ],
    teams: state.teams.map((candidate) =>
      candidate.teamConfigId === teamConfigId
        ? {
            ...candidate,
            projectedActivity: candidate.projectedActivity + member.activityEstimate,
            memberCount: candidate.memberCount + 1,
          }
        : candidate,
    ),
  };
};

export const planBirthday2026TeamAssignments = (
  teamConfigIds: number[],
  members: MemberAllocationCandidate[],
  random: () => number,
) => {
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

  const movableMembers = members
    .filter((member) => member.fixedTeamConfigId === undefined)
    .sort(
      (a, b) =>
        b.activityEstimate - a.activityEstimate || a.userId.localeCompare(b.userId),
    );

  const initialState: AllocationState = {
    assignments: [],
    teams: teamConfigIds.map((teamConfigId) => ({
      teamConfigId,
      projectedActivity: 0,
      memberCount: 0,
    })),
  };

  const stateAfterFixedMembers = members
    .filter((member) => member.fixedTeamConfigId !== undefined)
    .reduce((state, member) => {
      if (member.fixedTeamConfigId === undefined) return state;
      if (!state.teams.some((team) => team.teamConfigId === member.fixedTeamConfigId)) {
        throw new Error(`Unknown fixed team: ${member.fixedTeamConfigId}`);
      }
      return assignMember(state, member, member.fixedTeamConfigId);
    }, initialState);

  const finalState = movableMembers.reduce(
    (state, member) =>
      assignMember(state, member, pickLowestProjectedTeam(state.teams, random)),
    stateAfterFixedMembers,
  );

  return {
    assignments: finalState.assignments,
    teams: finalState.teams.toSorted((a, b) => a.teamConfigId - b.teamConfigId),
  };
};

export const findBirthday2026Teams = (prisma: PrismaTransaction, guildId: string) =>
  prisma.birthday2026TeamConfig.findMany({
    where: { config: { guildId } },
    include: {
      team: true,
      identity: true,
      persona: true,
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
    include: {
      teamConfig: {
        include: {
          team: true,
          identity: true,
        },
      },
    },
  });

export const createBirthday2026Team = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    name: string;
    roleId: string;
    color: number;
  },
) => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId: input.guildId },
    select: {
      id: true,
      economy: { select: { currencyId: true } },
    },
  });
  if (!config) return { ok: false, reason: "config_not_found" } as const;

  try {
    const team = await prisma.birthday2026TeamConfig.create({
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
        ...(config.economy
          ? {
              wallet: {
                create: {
                  currencyId: config.economy.currencyId,
                  balance: 0,
                  permanentWeight: 0,
                },
              },
            }
          : {}),
      },
      include: { team: true },
    });

    return { ok: true, team } as const;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const roleAlreadyUsed = await prisma.birthday2026TeamConfig.findUnique({
        where: { roleId: input.roleId },
        select: { id: true },
      });
      return roleAlreadyUsed
        ? ({ ok: false, reason: "role_already_used" } as const)
        : ({ ok: false, reason: "team_already_exists" } as const);
    }
    throw error;
  }
};

export const assignBirthday2026Member = (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    teamConfigId: number;
    userId: string;
  },
) =>
  prisma.$transaction(async (tx) => {
    const teamConfig = await tx.birthday2026TeamConfig.findFirst({
      where: { id: input.teamConfigId, config: { guildId: input.guildId } },
      select: { configId: true },
    });
    if (!teamConfig) return { ok: false, reason: "team_not_found" } as const;

    const existing = await tx.birthday2026MemberState.findUnique({
      where: {
        configId_userId: {
          configId: teamConfig.configId,
          userId: input.userId,
        },
      },
      include: {
        teamConfig: {
          select: {
            roleId: true,
            identity: {
              select: {
                captainUserId: true,
                tucznikUserId: true,
              },
            },
          },
        },
      },
    });
    if (existing?.teamConfigId === input.teamConfigId) {
      return { ok: false, reason: "already_in_team" } as const;
    }
    if (existing?.teamConfig.identity?.captainUserId === input.userId) {
      return { ok: false, reason: "captain_move_requires_replacement" } as const;
    }
    if (existing?.teamConfig.identity?.tucznikUserId === input.userId) {
      return { ok: false, reason: "tucznik_move_requires_replacement" } as const;
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
      previousRoleId: existing?.teamConfig.roleId ?? null,
    } as const;
  });

export const removeBirthday2026Member = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
) => {
  const member = await findBirthday2026Membership(prisma, guildId, userId);
  if (!member) return { ok: false, reason: "member_not_found" } as const;
  if (member.teamConfig.identity?.captainUserId === userId) {
    return { ok: false, reason: "captain_move_requires_replacement" } as const;
  }
  if (member.teamConfig.identity?.tucznikUserId === userId) {
    return { ok: false, reason: "tucznik_move_requires_replacement" } as const;
  }

  await prisma.birthday2026MemberState.delete({ where: { id: member.id } });
  return { ok: true, member } as const;
};

export const createBirthday2026TeamIdentity = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  teamConfigId: number,
  input: {
    captainUserId: string;
    tucznikUserId: string;
  },
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const teamConfig = await tx.birthday2026TeamConfig.findFirst({
        where: { id: teamConfigId, config: { guildId } },
        select: {
          id: true,
          configId: true,
          identity: { select: { teamConfigId: true } },
        },
      });

      if (!teamConfig) return { ok: false, reason: "team_not_found" } as const;
      if (teamConfig.identity) {
        return { ok: false, reason: "identity_already_configured" } as const;
      }

      if (teamConfig.identity) {
        return { ok: false, reason: "identity_already_configured" } as const;
      }
      const [captainMembership, tucznikMembership] = await Promise.all([
        tx.birthday2026MemberState.findUnique({
          where: {
            configId_userId: {
              configId: teamConfig.configId,
              userId: input.captainUserId,
            },
          },
        }),
        tx.birthday2026MemberState.findUnique({
          where: {
            configId_userId: {
              configId: teamConfig.configId,
              userId: input.tucznikUserId,
            },
          },
        }),
      ]);
      if (!captainMembership || captainMembership.teamConfigId !== teamConfig.id) {
        return { ok: false, reason: "captain_not_member" } as const;
      }

      if (!tucznikMembership || tucznikMembership.teamConfigId !== teamConfig.id) {
        return { ok: false, reason: "tucznik_not_member" } as const;
      }

      const identity = await tx.birthday2026TeamIdentity.create({
        data: {
          teamConfigId: teamConfig.id,
          configId: teamConfig.configId,
          tucznikUserId: input.tucznikUserId,
          captainUserId: input.captainUserId,
        },
      });
      return { ok: true, identity } as const;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, reason: "identity_already_assigned" } as const;
    }
    throw error;
  }
};

export const setBirthday2026Captain = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  teamConfigId: number,
  userId: string,
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const teamConfig = await tx.birthday2026TeamConfig.findFirst({
        where: { id: teamConfigId, config: { guildId } },
        select: {
          id: true,
          configId: true,
          identity: { select: { teamConfigId: true } },
        },
      });
      if (!teamConfig) return { ok: false, reason: "team_not_found" } as const;

      const membership = await tx.birthday2026MemberState.findUnique({
        where: {
          configId_userId: {
            configId: teamConfig.configId,
            userId,
          },
        },
      });
      if (!membership || membership.teamConfigId !== teamConfig.id) {
        return { ok: false, reason: "captain_not_member" } as const;
      }
      if (!teamConfig.identity) {
        return { ok: false, reason: "identity_not_configured" } as const;
      }

      const identity = await tx.birthday2026TeamIdentity.update({
        where: { teamConfigId: teamConfig.id },
        data: { captainUserId: userId },
      });
      const team = await tx.birthday2026TeamConfig.findUniqueOrThrow({
        where: { id: teamConfig.id },
      });
      return { ok: true, team, identity } as const;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, reason: "captain_already_assigned" } as const;
    }
    throw error;
  }
};

export const setBirthday2026Tucznik = (
  prisma: ExtendedPrismaClient,
  guildId: string,
  teamConfigId: number,
  userId: string,
  changedByUserId: string,
) =>
  prisma
    .$transaction(async (tx) => {
      const teamConfig = await tx.birthday2026TeamConfig.findFirst({
        where: { id: teamConfigId, config: { guildId } },
        select: {
          id: true,
          configId: true,
          identity: { select: { tucznikUserId: true } },
        },
      });
      if (!teamConfig) return { ok: false, reason: "team_not_found" } as const;
      const membership = await tx.birthday2026MemberState.findUnique({
        where: {
          configId_userId: {
            configId: teamConfig.configId,
            userId,
          },
        },
      });
      if (!membership || membership.teamConfigId !== teamConfig.id) {
        return { ok: false, reason: "tucznik_not_member" } as const;
      }
      if (!teamConfig.identity) {
        return { ok: false, reason: "identity_not_configured" } as const;
      }

      const identityChanged = teamConfig.identity.tucznikUserId !== userId;
      if (identityChanged) {
        await Promise.all([
          tx.birthday2026TeamPersona.deleteMany({
            where: { teamConfigId: teamConfig.id },
          }),
          tx.birthday2026TeamArtwork.deleteMany({
            where: { teamConfigId: teamConfig.id },
          }),
        ]);
      }

      const identity = await tx.birthday2026TeamIdentity.update({
        where: { teamConfigId: teamConfig.id },
        data: { tucznikUserId: userId },
      });
      if (identityChanged) {
        await tx.birthday2026TucznikChange.create({
          data: {
            teamConfigId: teamConfig.id,
            configId: teamConfig.configId,
            previousUserId: teamConfig.identity.tucznikUserId,
            nextUserId: userId,
            changedByUserId,
          },
        });
      }
      const team = await tx.birthday2026TeamConfig.findUniqueOrThrow({
        where: { id: teamConfig.id },
      });
      return { ok: true, team, identity } as const;
    })
    .catch((error) => {
      if (isUniqueConstraintError(error)) {
        return { ok: false, reason: "tucznik_already_assigned" } as const;
      }
      throw error;
    });

export const rebalanceBirthday2026Members = (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    activityEstimates: ReadonlyMap<string, number>;
    random: () => number;
  },
) =>
  prisma.$transaction(async (tx) => {
    const config = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      include: {
        teams: {
          include: {
            identity: true,
            memberStates: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!config) return { ok: false, reason: "config_not_found" } as const;
    if (config.teams.length === 0) {
      return { ok: false, reason: "no_teams" } as const;
    }

    const members: MemberAllocationCandidate[] = [];
    for (const team of config.teams) {
      for (const member of team.memberStates) {
        const activityEstimate = input.activityEstimates.get(member.userId);
        if (
          activityEstimate === undefined ||
          !Number.isFinite(activityEstimate) ||
          activityEstimate < 0
        ) {
          return { ok: false, reason: "invalid_activity_estimate" } as const;
        }
        members.push({
          userId: member.userId,
          activityEstimate,
          ...(team.identity?.captainUserId === member.userId
            ? { fixedTeamConfigId: team.id }
            : {}),
        });
      }
    }
    for (const team of config.teams) {
      if (
        team.identity?.captainUserId &&
        !team.memberStates.some(
          (member) => member.userId === team.identity?.captainUserId,
        )
      ) {
        return { ok: false, reason: "captain_not_member" } as const;
      }
      if (
        team.identity?.tucznikUserId &&
        !team.memberStates.some(
          (member) => member.userId === team.identity?.tucznikUserId,
        )
      ) {
        return { ok: false, reason: "tucznik_not_member" } as const;
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

    return { ok: true, plan } as const;
  });
