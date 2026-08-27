import type { PrismaTransaction } from "@hashira/db";

export type Birthday2026TeamStats = {
  teamConfigId: number;
  teamName: string;
  roleId: string;
  memberCount: number;
  permanentWeight: number;
  troughBalance: number;
  totalPasza: number;
  contributorCount: number;
  sharePercent: number;
};

export type Birthday2026MemberStats = {
  userId: string;
  teamConfigId: number;
  earned: number;
  earnedText: number;
  earnedVoice: number;
  earnedEncounter: number;
  earnedStaffGrant: number;
  fed: number;
  feedCount: number;
  unspent: number;
};

export type Birthday2026SourceStats = {
  teamConfigId: number;
  teamName: string;
  memberCount: number;
  avgPerMember: number;
  text: number;
  voice: number;
  encounter: number;
  staffGrant: number;
  textSharePercent: number;
  voiceSharePercent: number;
  encounterSharePercent: number;
  staffGrantSharePercent: number;
};

export type Birthday2026Stats = {
  teams: Birthday2026TeamStats[];
  members: Birthday2026MemberStats[];
  sources: Birthday2026SourceStats[];
  totalEarnedPasza: number;
  totalFedPasza: number;
  totalTeamPasza: number;
  totalUnspentPasza: number;
};

export type GetBirthday2026StatsResult =
  | { ok: true; stats: Birthday2026Stats }
  | { ok: false; reason: "config_not_found" | "economy_not_configured" };

const EARNED_SOURCES = ["staffGrant", "textActivity", "voiceActivity", "encounter"] as const;

type EarnedBySource = {
  text: number;
  voice: number;
  encounter: number;
  staffGrant: number;
};

const emptyEarned = (): EarnedBySource => ({
  text: 0,
  voice: 0,
  encounter: 0,
  staffGrant: 0,
});

const earnedTotal = (earned: EarnedBySource) =>
  earned.text + earned.voice + earned.encounter + earned.staffGrant;

export const getBirthday2026Stats = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<GetBirthday2026StatsResult> => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    include: {
      economy: { select: { currencyId: true } },
      teams: {
        include: {
          team: true,
          wallet: { select: { id: true, balance: true, permanentWeight: true } },
          memberStates: { select: { userId: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!config) return { ok: false, reason: "config_not_found" } as const;
  if (!config.economy) {
    return { ok: false, reason: "economy_not_configured" } as const;
  }

  const teams = config.teams;
  const memberUserIds = [
    ...new Set(teams.flatMap((team) => team.memberStates.map((member) => member.userId))),
  ];

  const [contributorRows, feedByUser, earnedRows, wallets] = await Promise.all([
    prisma.birthday2026FeedBatch.findMany({
      where: { configId: config.id },
      distinct: ["walletId", "userId"],
      select: { walletId: true },
    }),
    prisma.birthday2026FeedBatch.groupBy({
      by: ["userId"],
      where: { configId: config.id },
      _sum: { amount: true },
      _count: { userId: true },
    }),
    prisma.birthday2026PersonalTransaction.findMany({
      where: { configId: config.id, source: { in: [...EARNED_SOURCES] } },
      select: {
        userId: true,
        source: true,
        transaction: { select: { amount: true } },
      },
    }),
    memberUserIds.length > 0
      ? prisma.wallet.findMany({
          where: {
            currencyId: config.economy.currencyId,
            default: true,
            guildId,
            userId: { in: memberUserIds },
          },
          select: { userId: true, balance: true },
        })
      : Promise.resolve([] as { userId: string; balance: number }[]),
  ]);

  const contributorCountByWallet = new Map<number, number>();
  for (const row of contributorRows) {
    contributorCountByWallet.set(
      row.walletId,
      (contributorCountByWallet.get(row.walletId) ?? 0) + 1,
    );
  }

  const earnedByUser = new Map<string, EarnedBySource>();
  for (const row of earnedRows) {
    const earned = earnedByUser.get(row.userId) ?? emptyEarned();
    if (row.source === "textActivity") earned.text += row.transaction.amount;
    else if (row.source === "voiceActivity") earned.voice += row.transaction.amount;
    else if (row.source === "encounter") earned.encounter += row.transaction.amount;
    else earned.staffGrant += row.transaction.amount;
    earnedByUser.set(row.userId, earned);
  }

  const fedByUser = new Map<string, { fed: number; feedCount: number }>();
  for (const row of feedByUser) {
    fedByUser.set(row.userId, {
      fed: row._sum.amount ?? 0,
      feedCount: row._count.userId,
    });
  }

  const balanceByUser = new Map(wallets.map((wallet) => [wallet.userId, wallet.balance] as const));
  const teamByUserId = new Map<string, number>();
  for (const team of teams) {
    for (const member of team.memberStates) {
      teamByUserId.set(member.userId, team.id);
    }
  }

  const totalTeamPasza = teams.reduce(
    (total, team) => total + (team.wallet ? team.wallet.permanentWeight + team.wallet.balance : 0),
    0,
  );
  const teamStats: Birthday2026TeamStats[] = teams.map((team) => {
    const totalPasza = team.wallet ? team.wallet.permanentWeight + team.wallet.balance : 0;
    return {
      teamConfigId: team.id,
      teamName: team.team.name,
      roleId: team.roleId,
      memberCount: team.memberStates.length,
      permanentWeight: team.wallet?.permanentWeight ?? 0,
      troughBalance: team.wallet?.balance ?? 0,
      totalPasza,
      contributorCount: team.wallet ? (contributorCountByWallet.get(team.wallet.id) ?? 0) : 0,
      sharePercent: totalTeamPasza > 0 ? (totalPasza / totalTeamPasza) * 100 : 0,
    };
  });

  const memberStats: Birthday2026MemberStats[] = teams.flatMap((team) =>
    team.memberStates.map((member) => {
      const earned = earnedByUser.get(member.userId) ?? emptyEarned();
      const fed = fedByUser.get(member.userId) ?? { fed: 0, feedCount: 0 };
      return {
        userId: member.userId,
        teamConfigId: team.id,
        earned: earnedTotal(earned),
        earnedText: earned.text,
        earnedVoice: earned.voice,
        earnedEncounter: earned.encounter,
        earnedStaffGrant: earned.staffGrant,
        fed: fed.fed,
        feedCount: fed.feedCount,
        unspent: balanceByUser.get(member.userId) ?? 0,
      };
    }),
  );

  const sourceStats: Birthday2026SourceStats[] = teams
    .map((team) => {
      const sourceTotals = emptyEarned();
      for (const member of team.memberStates) {
        const earned = earnedByUser.get(member.userId);
        if (!earned) continue;
        sourceTotals.text += earned.text;
        sourceTotals.voice += earned.voice;
        sourceTotals.encounter += earned.encounter;
        sourceTotals.staffGrant += earned.staffGrant;
      }
      const teamEarned = earnedTotal(sourceTotals);
      const percent = (value: number) => (teamEarned > 0 ? (value / teamEarned) * 100 : 0);
      return {
        teamConfigId: team.id,
        teamName: team.team.name,
        memberCount: team.memberStates.length,
        avgPerMember: team.memberStates.length > 0 ? teamEarned / team.memberStates.length : 0,
        text: sourceTotals.text,
        voice: sourceTotals.voice,
        encounter: sourceTotals.encounter,
        staffGrant: sourceTotals.staffGrant,
        textSharePercent: percent(sourceTotals.text),
        voiceSharePercent: percent(sourceTotals.voice),
        encounterSharePercent: percent(sourceTotals.encounter),
        staffGrantSharePercent: percent(sourceTotals.staffGrant),
      };
    })
    .sort(
      (a, b) =>
        b.text +
        b.voice +
        b.encounter +
        b.staffGrant -
        (a.text + a.voice + a.encounter + a.staffGrant),
    );

  return {
    ok: true,
    stats: {
      teams: teamStats,
      members: memberStats,
      sources: sourceStats,
      totalEarnedPasza: memberStats.reduce((total, member) => total + member.earned, 0),
      totalFedPasza: memberStats.reduce((total, member) => total + member.fed, 0),
      totalTeamPasza,
      totalUnspentPasza: memberStats.reduce((total, member) => total + member.unspent, 0),
    },
  };
};

const tsv = (header: string[], rows: (string | number)[][]): string =>
  [header, ...rows].map((columns) => columns.join("\t")).join("\n");

const toFixed = (value: number, digits = 1) => value.toFixed(digits);

export const renderBirthday2026StatsFile = (
  stats: Birthday2026Stats,
  generatedAt: Date,
): string => {
  const sections: string[] = [
    `Birthday 2026 - statystyki Paszy (${generatedAt.toLocaleString("pl-PL")})`,
    "",
  ];

  sections.push(
    "1) DRUŻYNY - łączna Pasza w drużynie",
    tsv(
      ["druzyna", "waga_stala", "koryto", "pasza_lacznie", "udzial_pct", "karmiacy", "czlonkowie"],
      stats.teams
        .toSorted(
          (a, b) => b.totalPasza - a.totalPasza || a.teamName.localeCompare(b.teamName, "pl"),
        )
        .map((team) => [
          team.teamName,
          team.permanentWeight,
          team.troughBalance,
          team.totalPasza,
          toFixed(team.sharePercent),
          team.contributorCount,
          team.memberCount,
        ]),
    ),
    "",
  );

  sections.push(
    "2) ZAROBKI WG ZRODLA (na drużynę)",
    tsv(
      [
        "druzyna",
        "czlonkowie",
        "srednio_na_czlonka",
        "tekst",
        "glos",
        "wydarzenia",
        "granty_staffu",
        "tekst_pct",
        "glos_pct",
        "wydarzenia_pct",
        "granty_pct",
      ],
      stats.sources.map((source) => [
        source.teamName,
        source.memberCount,
        toFixed(source.avgPerMember),
        source.text,
        source.voice,
        source.encounter,
        source.staffGrant,
        toFixed(source.textSharePercent),
        toFixed(source.voiceSharePercent),
        toFixed(source.encounterSharePercent),
        toFixed(source.staffGrantSharePercent),
      ]),
    ),
    "",
  );

  sections.push(
    "3) CZŁONKOWIE - niewydana Pasza na osobę",
    tsv(
      [
        "user_id",
        "druzyna",
        "zarobiona",
        "tekst",
        "glos",
        "wydarzenia",
        "granty_staffu",
        "przekazana",
        "liczba_feedow",
        "niewydana",
      ],
      stats.members
        .toSorted(
          (a, b) =>
            teamNameOf(stats, a.teamConfigId).localeCompare(
              teamNameOf(stats, b.teamConfigId),
              "pl",
            ) || a.userId.localeCompare(b.userId),
        )
        .map((member) => [
          member.userId,
          teamNameOf(stats, member.teamConfigId),
          member.earned,
          member.earnedText,
          member.earnedVoice,
          member.earnedEncounter,
          member.earnedStaffGrant,
          member.fed,
          member.feedCount,
          member.unspent,
        ]),
    ),
  );

  return `${sections.join("\n")}\n`;
};

const teamNameOf = (stats: Birthday2026Stats, teamConfigId: number) =>
  stats.teams.find((team) => team.teamConfigId === teamConfigId)?.teamName ?? "";
