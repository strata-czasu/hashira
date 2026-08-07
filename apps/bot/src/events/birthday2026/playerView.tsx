/** @jsxImportSource @hashira/jsx */
import {
  ActionRow,
  Bold,
  Br,
  Button,
  Container,
  H1,
  H2,
  InlineCode,
  type JSXNode,
  Separator,
  TextDisplay,
} from "@hashira/jsx";
import {
  ButtonStyle,
  roleMention,
  TimestampStyles,
  time,
  userMention,
} from "discord.js";
import type {
  Birthday2026PlayerHistoryEntry,
  Birthday2026PlayerSnapshot,
  Birthday2026PublicTeam,
} from "./playerService";

export const BIRTHDAY_2026_FEED_ALL_CUSTOM_ID = "birthday2026-feed-all";
export const BIRTHDAY_2026_FEED_TEAM_BUTTON_CUSTOM_ID_PREFIX = "birthday2026-feed-team";
export const BIRTHDAY_2026_FEED_MODAL_CUSTOM_ID_PREFIX = "birthday2026-feed-modal";
export const BIRTHDAY_2026_FEED_AMOUNT_CUSTOM_ID = "birthday2026-feed-amount";

const eventStateLabels = {
  disabled: "wstrzymany",
  finished: "zakończony",
  hidden: "ukryty",
  not_configured: "nieskonfigurowany",
  not_started: "jeszcze się nie rozpoczął",
  open: "trwa",
} satisfies Record<Birthday2026PlayerSnapshot["eventState"], string>;

const historySourceLabels = {
  encounter: "szybkie wydarzenie",
  feed: "karmienie",
  settlement: "wygaśnięcie po rozliczeniu",
  staffGrant: "korekta administracji",
  textActivity: "aktywność tekstowa",
  voiceActivity: "aktywność głosowa",
} satisfies Record<Birthday2026PlayerHistoryEntry["source"], string>;

const formatPasza = (amount: number, symbol: string) =>
  `${amount.toLocaleString("pl-PL")} ${symbol}`;

const findPlayerTeam = (snapshot: Birthday2026PlayerSnapshot) =>
  snapshot.membership
    ? (snapshot.teams.find((team) => team.id === snapshot.membership?.teamConfigId) ??
      null)
    : null;

const formatHistory = (history: Birthday2026PlayerHistoryEntry[], symbol: string) =>
  history.length > 0
    ? history
        .map((entry) => {
          const sign = entry.entryType === "credit" ? "+" : "−";
          return `${sign}${formatPasza(entry.amount, symbol)} — ${historySourceLabels[entry.source]} — ${time(entry.createdAt, TimestampStyles.RelativeTime)}`;
        })
        .join("\n")
    : "Brak operacji w tym evencie.";

const getRankingPositions = (teams: Birthday2026PublicTeam[]) => {
  let previousWeight: number | null = null;
  let position = 0;

  return teams.map((team, index) => {
    if (team.permanentWeight !== previousWeight) position = index + 1;
    previousWeight = team.permanentWeight;
    return { position, team };
  });
};

export const buildBirthday2026InfoView = (
  snapshot: Birthday2026PlayerSnapshot,
): JSXNode => {
  const team = findPlayerTeam(snapshot);

  return (
    <Container accentColor={team?.color ?? 0xf5a623}>
      <TextDisplay>
        <H1>🐗 Nakarm Tucznika</H1>
        <Br />
        <Bold>Stan:</Bold> {eventStateLabels[snapshot.eventState]}
        <Br />
        <Bold>Start:</Bold> {time(snapshot.eventStartAt, TimestampStyles.LongDateTime)}
        <Br />
        <Bold>Koniec:</Bold> {time(snapshot.eventEndAt, TimestampStyles.LongDateTime)}
        <Br />
        <Bold>Strefa:</Bold> {snapshot.timezone}
        <Br />
        {team ? (
          <>
            <Bold>Twoja drużyna:</Bold> {roleMention(team.roleId)} — Tucznik:{" "}
            {userMention(team.tucznikUserId)}
          </>
        ) : snapshot.registered ? (
          "Udział jest już zarejestrowany. Drużynę przydzielimy przy początkowym przydziale."
        ) : (
          "Nie należysz jeszcze do drużyny eventowej."
        )}
      </TextDisplay>
      <Separator divider />
      <TextDisplay>
        {snapshot.registrationState === "open" && !snapshot.registered ? (
          <>
            Użyj <InlineCode>/tucznik dolacz</InlineCode>, aby zapisać się do eventu.
            <Br />
          </>
        ) : null}
        Zdobywaj Paszę za aktywność, a następnie użyj{" "}
        <InlineCode>/tucznik nakarm</InlineCode>, aby przekazać ją Tucznikowi swojej
        drużyny. Pasza trafia najpierw do koryta, a po trawieniu zwiększa stałą wagę
        eventową.
        <Br />
        Saldo sprawdzisz przez <InlineCode>/tucznik saldo</InlineCode>, a wyniki przez{" "}
        <InlineCode>/tucznik ranking</InlineCode>.
      </TextDisplay>
    </Container>
  );
};

export const buildBirthday2026BalanceView = (
  snapshot: Birthday2026PlayerSnapshot,
): JSXNode => {
  const team = findPlayerTeam(snapshot);
  const canFeed =
    Boolean(team) && snapshot.balance > 0 && snapshot.eventState === "open";

  return (
    <Container accentColor={team?.color ?? 0xf5a623}>
      <TextDisplay>
        <H1>Twoja Pasza</H1>
        <Br />
        <Bold>Saldo:</Bold> {formatPasza(snapshot.balance, snapshot.currencySymbol)}
        <Br />
        <Bold>Łącznie przekazano drużynie:</Bold>{" "}
        {formatPasza(snapshot.contributedPasza, snapshot.currencySymbol)}
        <Br />
        <Bold>Drużyna:</Bold>{" "}
        {team ? roleMention(team.roleId) : "nie należysz do drużyny eventowej"}
      </TextDisplay>
      <Separator divider />
      <TextDisplay>
        <H2>Ostatnie operacje</H2>
        <Br />
        {formatHistory(snapshot.history, snapshot.currencySymbol)}
      </TextDisplay>
      <ActionRow>
        <Button
          customId={BIRTHDAY_2026_FEED_ALL_CUSTOM_ID}
          disabled={!canFeed}
          emoji="🥣"
          label="Nakarm całą Paszą"
          style={ButtonStyle.Success}
        />
      </ActionRow>
    </Container>
  );
};

export const buildBirthday2026StatusView = (
  snapshot: Birthday2026PlayerSnapshot,
): JSXNode => (
  <Container accentColor={0xf5a623}>
    <TextDisplay>
      <H1>Stan Tuczników</H1>
      <Br />
      Stała waga jest wynikiem drużyny. Pasza w korycie oczekuje na trawienie.
    </TextDisplay>
    {snapshot.teams.map((team) => (
      <>
        <Separator divider />
        <TextDisplay>
          <H2>{team.name}</H2>
          <Br />
          <Bold>Tucznik:</Bold> {userMention(team.tucznikUserId)}
          <Br />
          <Bold>Kapitan:</Bold> {userMention(team.captainUserId)}
          <Br />
          <Bold>Stała waga:</Bold> {team.permanentWeight.toLocaleString("pl-PL")}
          <Br />
          <Bold>W korycie:</Bold>{" "}
          {formatPasza(team.pendingPasza, snapshot.currencySymbol)}
          <Br />
          <Bold>Osoby karmiące:</Bold> {team.contributorCount.toLocaleString("pl-PL")}
        </TextDisplay>
      </>
    ))}
  </Container>
);

export const buildBirthday2026RankingView = (
  snapshot: Birthday2026PlayerSnapshot,
): JSXNode => (
  <Container accentColor={0xffd700}>
    <TextDisplay>
      <H1>Ranking Tuczników</H1>
      <Br />
      {getRankingPositions(snapshot.teams)
        .map(
          ({ position, team }) =>
            `${position}. ${roleMention(team.roleId)} — ${team.permanentWeight.toLocaleString("pl-PL")} stałej wagi (${formatPasza(team.pendingPasza, snapshot.currencySymbol)} w korycie)`,
        )
        .join("\n")}
    </TextDisplay>
  </Container>
);

export const buildBirthday2026FeedResultView = (
  snapshot: Birthday2026PlayerSnapshot,
  amount: number,
  digestAt: Date,
  targetTeamConfigId: number,
): JSXNode => {
  const team = findPlayerTeam(snapshot);
  const isCrossFeed = targetTeamConfigId !== snapshot.membership?.teamConfigId;
  const targetTeam = snapshot.teams.find((team) => team.id === targetTeamConfigId);
  const canFeedAgain = snapshot.balance > 0 && snapshot.eventState === "open";

  return (
    <Container
      accentColor={
        isCrossFeed ? (targetTeam?.color ?? 0xf5a623) : (team?.color ?? 0xf5a623)
      }
    >
      <TextDisplay>
        <H1>{isCrossFeed ? "Pomyłka!" : "Tucznik nakarmiony!"}</H1>
        <Br />
        {isCrossFeed && targetTeam ? (
          <>
            <Bold>{formatPasza(amount, snapshot.currencySymbol)}</Bold> trafiło do
            koryta drużyny {roleMention(targetTeam.roleId)} zamiast Twojego Tucznika.
            Taka wpadka zdarza się tylko raz, zostaje między nami... chyba.
          </>
        ) : (
          <>
            Przekazano <Bold>{formatPasza(amount, snapshot.currencySymbol)}</Bold> do
            koryta Twojej drużyny.
          </>
        )}
        <Br />
        <Bold>Pozostałe saldo:</Bold>{" "}
        {formatPasza(snapshot.balance, snapshot.currencySymbol)}
        <Br />
        <Bold>Trawienie:</Bold> {time(digestAt, TimestampStyles.RelativeTime)}
      </TextDisplay>
      <ActionRow>
        <Button
          customId={BIRTHDAY_2026_FEED_ALL_CUSTOM_ID}
          disabled={!canFeedAgain}
          emoji="🥣"
          label="Nakarm resztą"
          style={ButtonStyle.Success}
        />
      </ActionRow>
    </Container>
  );
};

export const buildBirthday2026CrossFeedAnnouncementView = (input: {
  userId: string;
  amount: number;
  targetRoleId: string;
  accentColor: number;
}): JSXNode => (
  <Container accentColor={input.accentColor}>
    <TextDisplay>
      {userMention(input.userId)} dokarmił cudzego tucznika. Przekazał{" "}
      <Bold>{input.amount} paszy</Bold> do koryta drużyny{" "}
      {roleMention(input.targetRoleId)}.
      <Br />
      Gildia przypomina, że takie zachowanie jest niezgodne z wewnętrznymi ustaleniami
      dla poszukiwaczy przygód.
    </TextDisplay>
  </Container>
);
