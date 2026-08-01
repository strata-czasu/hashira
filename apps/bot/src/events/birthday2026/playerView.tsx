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

const eventStateLabels: Record<Birthday2026PlayerSnapshot["eventState"], string> = {
  disabled: "wstrzymany",
  finished: "zakończony",
  hidden: "ukryty",
  not_configured: "nieskonfigurowany",
  not_started: "jeszcze się nie rozpoczął",
  open: "trwa",
};

const historySourceLabels: Record<Birthday2026PlayerHistoryEntry["source"], string> = {
  encounter: "szybkie wydarzenie",
  feed: "karmienie",
  settlement: "wygaśnięcie po rozliczeniu",
  staffGrant: "korekta administracji",
  textActivity: "aktywność tekstowa",
  voiceActivity: "aktywność głosowa",
};

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
          "Jesteś zapisany. Drużynę otrzymasz przy początkowym przydziale."
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
): JSXNode => {
  const team = findPlayerTeam(snapshot);
  const canFeedAgain = snapshot.balance > 0 && snapshot.eventState === "open";

  return (
    <Container accentColor={team?.color ?? 0xf5a623}>
      <TextDisplay>
        <H1>🥣 Tucznik nakarmiony!</H1>
        <Br />
        Przekazano <Bold>{formatPasza(amount, snapshot.currencySymbol)}</Bold> do koryta{" "}
        {team ? roleMention(team.roleId) : "Twojej drużyny"}.
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
