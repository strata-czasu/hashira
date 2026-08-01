import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";
import {
  type Birthday2026EconomyErrorReason,
  type FeedBirthday2026PigInput,
  feedBirthday2026Pig,
} from "./economyService";
import {
  type Birthday2026EventState,
  getBirthday2026EventState,
  getBirthday2026RegistrationState,
} from "./eventState";

export type Birthday2026PublicErrorReason =
  | "economy_not_configured"
  | "event_not_available"
  | "teams_not_ready";

export type Birthday2026PlayerHistoryEntry = {
  amount: number;
  createdAt: Date;
  entryType: "credit" | "debit";
  reason: string | null;
  source:
    | "encounter"
    | "feed"
    | "settlement"
    | "staffGrant"
    | "textActivity"
    | "voiceActivity";
};

export type Birthday2026PublicTeam = {
  captainUserId: string;
  color: number;
  contributorCount: number;
  id: number;
  name: string;
  pendingPasza: number;
  permanentWeight: number;
  roleId: string;
  tucznikUserId: string;
};

export type Birthday2026PlayerSnapshot = {
  balance: number;
  contributedPasza: number;
  currencySymbol: string;
  eventEndAt: Date;
  eventStartAt: Date;
  eventState: Birthday2026EventState;
  history: Birthday2026PlayerHistoryEntry[];
  registered: boolean;
  registrationState: ReturnType<typeof getBirthday2026RegistrationState>;
  membership: {
    joinedAt: Date;
    teamConfigId: number;
  } | null;
  teams: Birthday2026PublicTeam[];
  timezone: string;
};

export type GetBirthday2026PlayerSnapshotResult =
  | { ok: true; snapshot: Birthday2026PlayerSnapshot }
  | { ok: false; reason: Birthday2026PublicErrorReason };

export const getBirthday2026PlayerSnapshot = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
  now: Date,
): Promise<GetBirthday2026PlayerSnapshotResult> => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    include: {
      economy: { include: { currency: true } },
      registrations: { where: { userId }, select: { userId: true } },
      teams: {
        include: {
          identity: true,
          persona: true,
          memberStates: {
            where: { userId },
            select: { joinedAt: true },
          },
          team: true,
          wallet: true,
        },
      },
    },
  });
  if (!config?.visible) {
    return { ok: false, reason: "event_not_available" } as const;
  }
  if (!config.economy) {
    return { ok: false, reason: "economy_not_configured" } as const;
  }
  if (config.teams.some((team) => !team.identity || !team.persona || !team.wallet)) {
    return { ok: false, reason: "teams_not_ready" };
  }

  const currencyId = config.economy.currencyId;
  const [wallet, history, contributorRows, contribution] = await Promise.all([
    prisma.wallet.findFirst({
      where: { currencyId, default: true, guildId, userId },
      select: { balance: true },
    }),
    prisma.birthday2026PersonalTransaction.findMany({
      where: { configId: config.id, userId },
      include: { transaction: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
    prisma.birthday2026FeedBatch.findMany({
      where: { configId: config.id },
      distinct: ["walletId", "userId"],
      select: { userId: true, walletId: true },
    }),
    prisma.birthday2026FeedBatch.aggregate({
      where: { configId: config.id, userId },
      _sum: { amount: true },
    }),
  ]);

  const contributorCounts = new Map<number, number>();
  for (const row of contributorRows) {
    contributorCounts.set(row.walletId, (contributorCounts.get(row.walletId) ?? 0) + 1);
  }

  const membership = config.teams
    .flatMap((team) =>
      team.memberStates.map((memberState) => ({
        joinedAt: memberState.joinedAt,
        teamConfigId: team.id,
      })),
    )
    .at(0);
  const teams = config.teams
    .map((team): Birthday2026PublicTeam => {
      if (!team.identity || !team.wallet) {
        throw new Error("Birthday 2026 public team readiness changed during query");
      }

      return {
        captainUserId: team.identity.captainUserId,
        color: team.color,
        contributorCount: contributorCounts.get(team.wallet.id) ?? 0,
        id: team.id,
        name: team.team.name,
        pendingPasza: team.wallet.balance,
        permanentWeight: team.wallet.permanentWeight,
        roleId: team.roleId,
        tucznikUserId: team.identity.tucznikUserId,
      };
    })
    .sort(
      (a, b) =>
        b.permanentWeight - a.permanentWeight || a.name.localeCompare(b.name, "pl"),
    );

  return {
    ok: true,
    snapshot: {
      balance: wallet?.balance ?? 0,
      contributedPasza: contribution._sum.amount ?? 0,
      currencySymbol: config.economy.currency.symbol,
      eventEndAt: config.eventEndAt,
      eventStartAt: config.eventStartAt,
      eventState: getBirthday2026EventState(config, now),
      history: history.map((entry) => ({
        amount: entry.transaction.amount,
        createdAt: entry.createdAt,
        entryType: entry.transaction.entryType,
        reason: entry.transaction.reason,
        source: entry.source,
      })),
      registered: config.registrations.length > 0,
      registrationState: getBirthday2026RegistrationState(config, now),
      membership: membership ?? null,
      teams,
      timezone: config.timezone,
    },
  };
};

export type Birthday2026PlayerFeedErrorReason =
  | Birthday2026EconomyErrorReason
  | Birthday2026PublicErrorReason
  | "event_not_open";

export const feedBirthday2026Player = async (
  prisma: ExtendedPrismaClient,
  input: FeedBirthday2026PigInput,
) => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId: input.guildId },
    include: {
      economy: { select: { configId: true } },
      teams: {
        select: {
          identity: { select: { teamConfigId: true } },
          persona: { select: { teamConfigId: true } },
          wallet: { select: { id: true } },
        },
      },
    },
  });
  if (!config?.visible) {
    return { ok: false, reason: "event_not_available" } as const;
  }
  if (!config.economy) {
    return { ok: false, reason: "economy_not_configured" } as const;
  }
  if (config.teams.some((team) => !team.identity || !team.persona || !team.wallet)) {
    return { ok: false, reason: "teams_not_ready" } as const;
  }
  if (getBirthday2026EventState(config, input.acceptedAt) !== "open") {
    return { ok: false, reason: "event_not_open" } as const;
  }

  return feedBirthday2026Pig(prisma, input);
};
