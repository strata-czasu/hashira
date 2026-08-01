import { type ExtendedPrismaClient, Prisma, type PrismaTransaction } from "@hashira/db";
import { isUniqueConstraintError } from "../../util/isUniqueConstraintError";
import { getBirthday2026RegistrationState } from "./eventState";
import { planBirthday2026TeamAssignments } from "./teamService";

const lockBirthday2026RegistrationConfig = async (
  prisma: PrismaTransaction,
  guildId: string,
) => {
  const [config] = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
    SELECT "id"
    FROM "Birthday2026Config"
    WHERE "guildId" = ${guildId}
    FOR UPDATE
  `);
  return config;
};

export const registerBirthday2026Participant = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  userId: string,
  now: Date,
  random: () => number,
) =>
  prisma.$transaction(async (tx) => {
    const configRecord = await lockBirthday2026RegistrationConfig(tx, guildId);
    if (!configRecord) {
      return { ok: false, reason: "event_not_available" } as const;
    }
    const config = await tx.birthday2026Config.findUniqueOrThrow({
      where: { id: configRecord.id },
      include: {
        rosterFinalization: true,
        textEarning: true,
        voiceEarning: true,
        teams: {
          include: { identity: true, memberStates: true, persona: true },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!config.visible) {
      return { ok: false, reason: "event_not_available" } as const;
    }
    if (getBirthday2026RegistrationState(config, now) !== "open") {
      return { ok: false, reason: "registration_closed" } as const;
    }
    if (
      config.teams.length !== 4 ||
      config.teams.some((team) => !team.identity || !team.persona)
    ) {
      return { ok: false, reason: "teams_not_ready" } as const;
    }
    if (
      config.teams.some((team) => team.memberStates.some((m) => m.userId === userId))
    ) {
      return { ok: false, reason: "already_assigned" } as const;
    }
    const result = await tx.birthday2026Registration.createMany({
      data: { configId: config.id, userId },
      skipDuplicates: true,
    });
    if (result.count === 0) {
      return { ok: false, reason: "already_registered" } as const;
    }
    if (!config.rosterFinalization) {
      return { ok: true, assigned: false } as const;
    }
    if (!config.textEarning || !config.voiceEarning) {
      throw new Error("Finalized Birthday 2026 roster has no earning configuration");
    }

    const activityEstimates = await getActivityEstimates(
      tx,
      {
        id: config.id,
        guildId: config.guildId,
        textEarning: config.textEarning,
        voiceEarning: config.voiceEarning,
      },
      config.rosterFinalization.analysisStartAt,
      config.rosterFinalization.analysisEndAt,
    );
    const plan = planBirthday2026TeamAssignments(
      config.teams.map((team) => team.id),
      [
        ...config.teams.flatMap((team) =>
          team.memberStates.map((member) => ({
            userId: member.userId,
            activityEstimate: activityEstimates.get(member.userId) ?? 0,
            fixedTeamConfigId: team.id,
          })),
        ),
        { userId, activityEstimate: activityEstimates.get(userId) ?? 0 },
      ],
      random,
    );
    const assignment = plan.assignments.find(
      (candidate) => candidate.userId === userId,
    );
    if (!assignment) throw new Error("Failed to assign Birthday 2026 participant");
    const team = config.teams.find(
      (candidate) => candidate.id === assignment.teamConfigId,
    );
    if (!team) throw new Error("Assigned an unknown Birthday 2026 team");

    await tx.birthday2026MemberState.create({
      data: {
        configId: config.id,
        teamConfigId: assignment.teamConfigId,
        userId,
      },
    });
    return {
      ok: true,
      assigned: true,
      roleId: team.roleId,
      teamConfigId: team.id,
    } as const;
  });

export const withdrawBirthday2026Registration = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  userId: string,
  now: Date,
) =>
  prisma.$transaction(async (tx) => {
    const configRecord = await lockBirthday2026RegistrationConfig(tx, guildId);
    if (!configRecord) {
      return { ok: false, reason: "event_not_available" } as const;
    }
    const config = await tx.birthday2026Config.findUniqueOrThrow({
      where: { id: configRecord.id },
      include: {
        teams: {
          select: {
            memberStates: { where: { userId }, select: { id: true } },
          },
        },
      },
    });
    if (!config.visible) {
      return { ok: false, reason: "event_not_available" } as const;
    }
    if (getBirthday2026RegistrationState(config, now) !== "open") {
      return { ok: false, reason: "registration_closed" } as const;
    }
    if (config.teams.some((team) => team.memberStates.length > 0)) {
      return { ok: false, reason: "already_assigned" } as const;
    }

    const result = await tx.birthday2026Registration.deleteMany({
      where: { configId: config.id, userId },
    });
    return result.count === 0
      ? ({ ok: false, reason: "not_registered" } as const)
      : ({ ok: true } as const);
  });

const getActivityEstimates = async (
  prisma: PrismaTransaction,
  config: {
    id: number;
    guildId: string;
    textEarning: { dailyCap: number; windowSeconds: number };
    voiceEarning: { dailyCap: number; unitSeconds: number };
  },
  analysisStartAt: Date,
  analysisEndAt: Date,
) => {
  const rows = await prisma.$queryRaw<
    { userId: string; activityEstimate: number }[]
  >(Prisma.sql`
    WITH participants AS (
      SELECT "userId"
      FROM "Birthday2026Registration"
      WHERE "configId" = ${config.id}
      UNION
      SELECT "userId"
      FROM "Birthday2026MemberState"
      WHERE "configId" = ${config.id}
    ),
    text_daily AS (
      SELECT
        uta."userId",
        FLOOR(EXTRACT(EPOCH FROM (uta."timestamp" - ${analysisStartAt}::timestamp)) / 86400)::int AS day_index,
        LEAST(
          COUNT(DISTINCT FLOOR(EXTRACT(EPOCH FROM uta."timestamp") / ${config.textEarning.windowSeconds})),
          ${config.textEarning.dailyCap}
        )::double precision AS score
      FROM "userTextActivity" uta
      JOIN participants p ON p."userId" = uta."userId"
      WHERE uta."guildId" = ${config.guildId}
        AND uta."timestamp" >= ${analysisStartAt}
        AND uta."timestamp" < ${analysisEndAt}
        AND NOT EXISTS (
          SELECT 1
          FROM "Birthday2026DisabledTextChannel" dc
          WHERE dc."configId" = ${config.id}
            AND dc."channelId" = uta."channelId"
        )
      GROUP BY uta."userId", day_index
    ),
    voice_daily AS (
      SELECT
        vs."userId",
        FLOOR(EXTRACT(EPOCH FROM (vs."joinedAt" - ${analysisStartAt}::timestamp)) / 86400)::int AS day_index,
        LEAST(
          FLOOR(SUM(vst."secondsSpent") / ${config.voiceEarning.unitSeconds}),
          ${config.voiceEarning.dailyCap}
        )::double precision AS score
      FROM "VoiceSession" vs
      JOIN participants p ON p."userId" = vs."userId"
      JOIN "VoiceSessionTotal" vst
        ON vst."voiceSessionId" = vs.id
        AND vst."isMuted" = false
        AND vst."isDeafened" = false
        AND vst."isAlone" = false
      WHERE vs."guildId" = ${config.guildId}
        AND vs."joinedAt" >= ${analysisStartAt}
        AND vs."joinedAt" < ${analysisEndAt}
      GROUP BY vs."userId", day_index
    ),
    weekly AS (
      SELECT
        activity."userId",
        FLOOR(activity.day_index / 7)::int AS week_index,
        SUM(activity.score) AS score
      FROM (
        SELECT * FROM text_daily
        UNION ALL
        SELECT * FROM voice_daily
      ) activity
      GROUP BY activity."userId", week_index
    )
    SELECT
      p."userId",
      COALESCE(SUM(
        weekly.score * CASE weekly.week_index
          WHEN 0 THEN 0.1
          WHEN 1 THEN 0.2
          WHEN 2 THEN 0.3
          WHEN 3 THEN 0.4
          ELSE 0
        END
      ), 0)::double precision AS "activityEstimate"
    FROM participants p
    LEFT JOIN weekly ON weekly."userId" = p."userId"
    GROUP BY p."userId"
  `);

  return new Map(rows.map((row) => [row.userId, row.activityEstimate]));
};

export const finalizeBirthday2026Registration = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  random: () => number,
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const configRecord = await lockBirthday2026RegistrationConfig(tx, guildId);
      if (!configRecord) return { ok: false, reason: "config_not_found" } as const;
      const config = await tx.birthday2026Config.findUnique({
        where: { id: configRecord.id },
        include: {
          registrations: { select: { userId: true } },
          rosterFinalization: true,
          textEarning: true,
          voiceEarning: true,
          teams: {
            include: { identity: true, persona: true, memberStates: true },
            orderBy: { id: "asc" },
          },
        },
      });
      if (!config) throw new Error("Locked Birthday 2026 config disappeared");
      if (config.rosterFinalization) {
        return { ok: false, reason: "already_finalized" } as const;
      }
      if (config.enabled) return { ok: false, reason: "event_enabled" } as const;
      if (
        config.teams.length !== 4 ||
        config.teams.some((team) => !team.identity || !team.persona)
      ) {
        return { ok: false, reason: "teams_not_ready" } as const;
      }
      if (!config.textEarning || !config.voiceEarning) {
        return { ok: false, reason: "earning_not_configured" } as const;
      }

      const analysisEndAt = config.eventStartAt;
      const analysisStartAt = new Date(analysisEndAt.getTime() - 28 * 86_400_000);
      const activityEstimates = await getActivityEstimates(
        tx,
        {
          id: config.id,
          guildId: config.guildId,
          textEarning: config.textEarning,
          voiceEarning: config.voiceEarning,
        },
        analysisStartAt,
        analysisEndAt,
      );
      const memberIds = new Set(
        config.registrations.map((registration) => registration.userId),
      );
      for (const team of config.teams) {
        for (const member of team.memberStates) {
          memberIds.add(member.userId);
        }
      }

      const plan = planBirthday2026TeamAssignments(
        config.teams.map((team) => team.id),
        [...memberIds].map((userId) => {
          const fixedTeam = config.teams.find(
            (team) =>
              team.identity?.captainUserId === userId ||
              team.identity?.tucznikUserId === userId,
          );
          return {
            userId,
            activityEstimate: activityEstimates.get(userId) ?? 0,
            ...(fixedTeam ? { fixedTeamConfigId: fixedTeam.id } : {}),
          };
        }),
        random,
      );

      await Promise.all(
        plan.assignments.map((assignment) =>
          tx.birthday2026MemberState.upsert({
            where: {
              configId_userId: { configId: config.id, userId: assignment.userId },
            },
            create: {
              configId: config.id,
              teamConfigId: assignment.teamConfigId,
              userId: assignment.userId,
            },
            update: { teamConfigId: assignment.teamConfigId },
          }),
        ),
      );
      await tx.birthday2026RosterFinalization.create({
        data: { configId: config.id, analysisStartAt, analysisEndAt },
      });

      return {
        ok: true,
        assignments: plan.assignments.map((assignment) => {
          const team = config.teams.find(
            (candidate) => candidate.id === assignment.teamConfigId,
          );
          if (!team) throw new Error("Planned an unknown Birthday 2026 team");
          return { ...assignment, roleId: team.roleId };
        }),
        teams: plan.teams.map((plannedTeam) => {
          const team = config.teams.find(
            (candidate) => candidate.id === plannedTeam.teamConfigId,
          );
          if (!team) throw new Error("Planned an unknown Birthday 2026 team");
          return { ...plannedTeam, roleId: team.roleId };
        }),
      } as const;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, reason: "already_finalized" } as const;
    }
    throw error;
  }
};

export const findBirthday2026RoleAssignments = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
) => {
  const teams = await prisma.birthday2026TeamConfig.findMany({
    where: { config: { guildId } },
    select: {
      roleId: true,
      memberStates: { select: { userId: true } },
    },
  });
  return {
    roleIds: teams.map((team) => team.roleId),
    assignments: teams.flatMap((team) =>
      team.memberStates.map((member) => ({
        userId: member.userId,
        roleId: team.roleId,
      })),
    ),
  };
};
