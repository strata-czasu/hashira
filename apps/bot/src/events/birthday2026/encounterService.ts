import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { render } from "@hashira/jsx";
import { addSeconds } from "date-fns";
import { type Client, RESTJSONErrorCodes } from "discord.js";
import { addBalance } from "../../economy/managers/transferManager";
import { discordTry } from "../../util/discordTry";
import { claimBirthday2026Config } from "./configService";
import { buildBirthday2026EncounterView } from "./encounterView";
import { getBirthday2026EventState } from "./eventState";

const isPositiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;

export const configureBirthday2026Encounters = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    channelId: string;
    responseWindowSeconds: number;
    spawnIntervalSeconds: number;
    individualReward: number;
    winCap: number;
    teamThreshold: number;
    teamReward: number;
  },
) => {
  const channelId = input.channelId.trim();
  if (
    !channelId ||
    !isPositiveInteger(input.responseWindowSeconds) ||
    !isPositiveInteger(input.spawnIntervalSeconds) ||
    !isPositiveInteger(input.individualReward) ||
    !isPositiveInteger(input.winCap) ||
    !isPositiveInteger(input.teamThreshold) ||
    !isPositiveInteger(input.teamReward)
  ) {
    return { ok: false, reason: "invalid_config" } as const;
  }

  return prisma.$transaction(async (tx) => {
    const config = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      select: { id: true },
    });
    if (!config) return { ok: false, reason: "config_not_found" } as const;
    const state = await claimBirthday2026Config(tx, config.id);
    if (state.settlement) return { ok: false, reason: "event_settled" } as const;

    const encounterConfig = await tx.birthday2026EncounterConfig.upsert({
      where: { configId: config.id },
      create: {
        configId: config.id,
        channelId,
        responseWindowSeconds: input.responseWindowSeconds,
        spawnIntervalSeconds: input.spawnIntervalSeconds,
        individualReward: input.individualReward,
        winCap: input.winCap,
        teamThreshold: input.teamThreshold,
        teamReward: input.teamReward,
      },
      update: {
        channelId,
        responseWindowSeconds: input.responseWindowSeconds,
        spawnIntervalSeconds: input.spawnIntervalSeconds,
        individualReward: input.individualReward,
        winCap: input.winCap,
        teamThreshold: input.teamThreshold,
        teamReward: input.teamReward,
      },
    });
    return { ok: true, config: encounterConfig } as const;
  });
};

type ScheduleEncounterJob = (
  tx: PrismaTransaction,
  type: "birthday2026EncounterExpire" | "birthday2026EncounterSpawn",
  encounterId: number,
  handleAfter: Date,
) => Promise<void>;

export const spawnBirthday2026Encounter = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    kind: "quickGrab" | "teamThreshold";
    sourceKey: string;
    startsAt: Date;
    scheduleJob: ScheduleEncounterJob;
  },
) => {
  const sourceKey = input.sourceKey.trim();
  if (!sourceKey) return { ok: false, reason: "invalid_source_key" } as const;

  return prisma.$transaction(async (tx) => {
    const configRecord = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      select: { id: true },
    });
    if (!configRecord) return { ok: false, reason: "config_not_found" } as const;
    await claimBirthday2026Config(tx, configRecord.id);
    const config = await tx.birthday2026Config.findUniqueOrThrow({
      where: { id: configRecord.id },
      include: { encounterConfig: true, settlement: true },
    });
    if (config.settlement) return { ok: false, reason: "event_settled" } as const;
    if (getBirthday2026EventState(config, input.startsAt) !== "open") {
      return { ok: false, reason: "event_not_open" } as const;
    }
    if (!config.encounterConfig) {
      return { ok: false, reason: "encounters_not_configured" } as const;
    }
    const duplicate = await tx.birthday2026Encounter.findUnique({
      where: { configId_sourceKey: { configId: config.id, sourceKey } },
    });
    if (duplicate) return { ok: true, created: false, encounter: duplicate } as const;

    const active = await tx.birthday2026Encounter.findFirst({
      where: {
        configId: config.id,
        cancelledAt: null,
        resolvedAt: null,
        expiresAt: { gt: input.startsAt },
      },
      select: { id: true },
    });
    if (active) return { ok: false, reason: "encounter_active" } as const;

    const encounter = await tx.birthday2026Encounter.create({
      data: {
        configId: config.id,
        kind: input.kind,
        sourceKey,
        startsAt: input.startsAt,
        expiresAt: addSeconds(
          input.startsAt,
          config.encounterConfig.responseWindowSeconds,
        ),
      },
    });
    await Promise.all([
      input.scheduleJob(
        tx,
        "birthday2026EncounterExpire",
        encounter.id,
        encounter.expiresAt,
      ),
      input.scheduleJob(
        tx,
        "birthday2026EncounterSpawn",
        encounter.id,
        addSeconds(encounter.expiresAt, config.encounterConfig.spawnIntervalSeconds),
      ),
    ]);
    return { ok: true, created: true, encounter } as const;
  });
};

export const enterBirthday2026Encounter = (
  prisma: ExtendedPrismaClient,
  input: { encounterId: number; guildId: string; userId: string; enteredAt: Date },
) =>
  prisma.$transaction(async (tx) => {
    const initial = await tx.birthday2026Encounter.findUnique({
      where: { id: input.encounterId },
      select: { configId: true, config: { select: { guildId: true } } },
    });
    if (!initial) return { ok: false, reason: "encounter_not_found" } as const;
    if (initial.config.guildId !== input.guildId) {
      return { ok: false, reason: "encounter_not_found" } as const;
    }
    const state = await claimBirthday2026Config(tx, initial.configId);
    if (state.settlement) return { ok: false, reason: "event_settled" } as const;

    const encounter = await tx.birthday2026Encounter.findUnique({
      where: { id: input.encounterId },
      include: {
        config: { include: { economy: true, encounterConfig: true } },
      },
    });
    if (!encounter) return { ok: false, reason: "encounter_not_found" } as const;
    if (
      !encounter.config.enabled ||
      encounter.cancelledAt ||
      encounter.resolvedAt ||
      input.enteredAt < encounter.startsAt ||
      input.enteredAt >= encounter.expiresAt
    ) {
      return { ok: false, reason: "encounter_not_open" } as const;
    }
    if (!encounter.config.economy || !encounter.config.encounterConfig) {
      return { ok: false, reason: "encounters_not_configured" } as const;
    }

    const membership = await tx.birthday2026MemberState.findUnique({
      where: {
        configId_userId: {
          configId: encounter.configId,
          userId: input.userId,
        },
      },
      include: { teamConfig: { include: { wallet: true } } },
    });
    if (!membership) return { ok: false, reason: "member_not_found" } as const;

    if (encounter.kind === "quickGrab") {
      const wins = await tx.birthday2026EncounterWinner.count({
        where: { configId: encounter.configId, userId: input.userId },
      });
      if (wins >= encounter.config.encounterConfig.winCap) {
        return { ok: false, reason: "win_cap_reached" } as const;
      }
    }

    const entry = await tx.birthday2026EncounterEntry.createMany({
      data: {
        encounterId: encounter.id,
        teamConfigId: membership.teamConfigId,
        configId: encounter.configId,
        userId: input.userId,
        enteredAt: input.enteredAt,
      },
      skipDuplicates: true,
    });
    if (entry.count === 0) {
      return { ok: false, reason: "already_entered" } as const;
    }

    if (encounter.kind === "quickGrab") {
      const claim = await tx.birthday2026Encounter.updateMany({
        where: {
          id: encounter.id,
          cancelledAt: null,
          resolvedAt: null,
          expiresAt: { gt: input.enteredAt },
        },
        data: { resolvedAt: input.enteredAt },
      });
      if (claim.count === 0) {
        return { ok: false, reason: "encounter_not_open" } as const;
      }

      const reward = encounter.config.encounterConfig.individualReward;
      const { transaction, wallet: updatedWallet } = await addBalance({
        prisma: nestedTransaction(tx),
        guildId: encounter.config.guildId,
        toUserId: input.userId,
        currencyId: encounter.config.economy.currencyId,
        amount: reward,
        reason: `Birthday 2026 quick encounter ${encounter.id}`,
      });
      await Promise.all([
        tx.birthday2026PersonalTransaction.create({
          data: {
            configId: encounter.configId,
            userId: input.userId,
            transactionId: transaction.id,
            source: "encounter",
            sourceKey: `encounter:${encounter.id}`,
            createdAt: input.enteredAt,
          },
        }),
        tx.birthday2026EncounterWinner.create({
          data: {
            encounterId: encounter.id,
            configId: encounter.configId,
            userId: input.userId,
            transactionId: transaction.id,
            reward,
            wonAt: input.enteredAt,
          },
        }),
      ]);
      return {
        ok: true,
        status: "won",
        reward,
        teamConfigId: membership.teamConfigId,
        walletBalance: updatedWallet.balance,
      } as const;
    }

    const progress = await tx.birthday2026EncounterEntry.count({
      where: {
        encounterId: encounter.id,
        teamConfigId: membership.teamConfigId,
      },
    });
    if (progress < encounter.config.encounterConfig.teamThreshold) {
      return {
        ok: true,
        status: "progress",
        progress,
        threshold: encounter.config.encounterConfig.teamThreshold,
        teamConfigId: membership.teamConfigId,
      } as const;
    }

    if (!membership.teamConfig.wallet) {
      return { ok: false, reason: "team_wallet_not_found" } as const;
    }
    const completion = await tx.birthday2026TeamEncounterCompletion.createMany({
      data: {
        encounterId: encounter.id,
        teamConfigId: membership.teamConfigId,
        configId: encounter.configId,
        reward: encounter.config.encounterConfig.teamReward,
        completedAt: input.enteredAt,
      },
      skipDuplicates: true,
    });
    if (completion.count > 0) {
      await tx.birthday2026TeamWallet.update({
        where: { id: membership.teamConfig.wallet.id },
        data: {
          permanentWeight: {
            increment: encounter.config.encounterConfig.teamReward,
          },
        },
      });
    }
    return {
      ok: true,
      status: completion.count > 0 ? "completed" : "already_completed",
      progress,
      threshold: encounter.config.encounterConfig.teamThreshold,
      reward: completion.count > 0 ? encounter.config.encounterConfig.teamReward : 0,
      teamConfigId: membership.teamConfigId,
    } as const;
  });

export const finishBirthday2026Encounter = (
  prisma: ExtendedPrismaClient,
  encounterId: number,
  finishedAt: Date,
) =>
  prisma.birthday2026Encounter.updateMany({
    where: { id: encounterId, resolvedAt: null },
    data: { resolvedAt: finishedAt },
  });

export const cancelBirthday2026Encounter = (
  prisma: ExtendedPrismaClient,
  guildId: string,
  encounterId: number,
  cancelledAt: Date,
) =>
  prisma.birthday2026Encounter.updateMany({
    where: {
      id: encounterId,
      config: { guildId },
      cancelledAt: null,
      resolvedAt: null,
    },
    data: { cancelledAt },
  });

export const attachBirthday2026EncounterMessage = (
  prisma: PrismaTransaction,
  encounterId: number,
  channelId: string,
  messageId: string,
) =>
  prisma.birthday2026EncounterMessage.upsert({
    where: { encounterId },
    create: { encounterId, channelId, messageId },
    update: { channelId, messageId },
  });

export const inspectBirthday2026Encounters = (
  prisma: PrismaTransaction,
  guildId: string,
) =>
  prisma.birthday2026Encounter.findMany({
    where: { config: { guildId } },
    include: {
      message: true,
      winner: true,
      teamCompletions: true,
      _count: { select: { entries: true } },
    },
    orderBy: { id: "desc" },
    take: 10,
  });

export const reconcileBirthday2026EncounterMessage = async (
  client: Client,
  prisma: ExtendedPrismaClient,
  encounterId: number,
  now: Date,
) => {
  const encounter = await prisma.birthday2026Encounter.findUnique({
    where: { id: encounterId },
    include: {
      config: { include: { encounterConfig: true } },
      entries: { include: { teamConfig: true } },
      message: true,
      teamCompletions: true,
      winner: true,
    },
  });
  if (!encounter) return { ok: false, reason: "encounter_not_found" } as const;
  const encounterConfig = encounter.config.encounterConfig;
  if (!encounterConfig) {
    return { ok: false, reason: "encounters_not_configured" } as const;
  }
  const channelId = encounterConfig.channelId;
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isSendable()) {
    return { ok: false, reason: "channel_not_sendable" } as const;
  }

  const progressByTeam = new Map<number, { progress: number; roleId: string }>();
  for (const entry of encounter.entries) {
    const progress = progressByTeam.get(entry.teamConfigId)?.progress ?? 0;
    progressByTeam.set(entry.teamConfigId, {
      progress: progress + 1,
      roleId: entry.teamConfig.roleId,
    });
  }
  const completedTeams = new Set(
    encounter.teamCompletions.map((completion) => completion.teamConfigId),
  );
  const messageData = render(
    buildBirthday2026EncounterView({
      id: encounter.id,
      kind: encounter.kind,
      disabled: Boolean(
        encounter.cancelledAt || encounter.resolvedAt || now >= encounter.expiresAt,
      ),
      winnerUserId: encounter.winner?.userId ?? null,
      teamProgress: [...progressByTeam.entries()]
        .map(([teamConfigId, { progress, roleId }]) => ({
          roleId,
          progress,
          threshold: encounterConfig.teamThreshold,
          completed: completedTeams.has(teamConfigId),
        }))
        .sort((a, b) => a.roleId.localeCompare(b.roleId)),
    }),
  );
  const encounterMessage = encounter.message;
  const existingMessage = encounterMessage
    ? await discordTry(
        () =>
          channel.messages.fetch({
            message: encounterMessage.messageId,
            cache: false,
          }),
        [RESTJSONErrorCodes.UnknownMessage],
        () => null,
      )
    : null;
  const message = existingMessage
    ? await existingMessage.edit(messageData)
    : await channel.send(messageData);
  await attachBirthday2026EncounterMessage(prisma, encounter.id, channelId, message.id);
  return { ok: true, recreated: !existingMessage } as const;
};
