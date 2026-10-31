import {
  bold,
  ButtonStyle,
  heading,
  HeadingLevel,
  subtext,
  time,
  TimestampStyles,
  userMention,
} from "discord.js";

import type { Halloween2026TotKnock } from "@hashira/db";
/** @jsxImportSource @hashira/jsx */
import { ActionRow, Button, Container, Separator, TextDisplay } from "@hashira/jsx";

import { createPluralize } from "../../util/pluralize";
import { formatTotItem, TOT_CANDIES_PER_KAPSEL, TOT_ITEM_KEYS, TOT_ITEMS } from "./constants";
import type { TrickOutcome } from "./outcomeTable";
import type { TotPlayerSnapshot } from "./playerService";
import type { TotAnswerResolution, TotMuteResolution } from "./resolution";

export const TOT_ANSWER_CUSTOM_ID = "halloween2026-tot-answer";
export const TOT_COMMAND = "/cukierek-albo-psikus";

const TOT_COLOR = 0xff7518;

const minutes = createPluralize({ one: "minutę", few: "minuty", many: "minut" });
const candies = createPluralize({ one: "cukierek", few: "cukierki", many: "cukierków" });

export const formatCandies = (count: number) => `${count} ${candies(count)}`;

const knockerLabel = (knock: Halloween2026TotKnock) =>
  knock.anonymous ? "Ktoś w masce" : userMention(knock.knockerId);

type FinishedState = { type: "answered"; lines: string[] } | { type: "expired" };
type PorchState = { type: "pending"; hostHasDice: boolean } | FinishedState;

export const buildTotPorchView = (input: { knock: Halloween2026TotKnock; state: PorchState }) => {
  const { knock, state } = input;
  const host = userMention(knock.hostId);
  const header = `${knockerLabel(knock)} puka do drzwi ${host}. Cukierek albo psikus?`;

  return (
    <Container accentColor={TOT_COLOR}>
      <TextDisplay>{header}</TextDisplay>
      {state.type === "pending" ? (
        <>
          <Separator divider />
          <TextDisplay>
            {[
              ...(state.hostHasDice
                ? [
                    subtext(
                      `${host} ma kostkę losu. Przy psikusie z kostką rzuca dwa razy i liczy się lepszy wynik.`,
                    ),
                  ]
                : []),
              subtext(
                `${host} ma czas do ${time(knock.expiresAt, TimestampStyles.ShortTime)}. Tylko gospodarz może otworzyć drzwi.`,
              ),
            ].join("\n")}
          </TextDisplay>
          <ActionRow>
            <Button
              customId={`${TOT_ANSWER_CUSTOM_ID}:${knock.id}:treat`}
              emoji="🍬"
              label="Daj cukierka"
              style={ButtonStyle.Success}
            />
            <Button
              customId={`${TOT_ANSWER_CUSTOM_ID}:${knock.id}:trick`}
              emoji="🎃"
              label="Psikus"
              style={ButtonStyle.Danger}
            />
            {state.hostHasDice ? (
              <Button
                customId={`${TOT_ANSWER_CUSTOM_ID}:${knock.id}:dice`}
                emoji="🎲"
                label="Psikus z kostką"
                style={ButtonStyle.Secondary}
              />
            ) : null}
          </ActionRow>
        </>
      ) : null}
      {state.type === "answered" ? (
        <>
          <Separator divider />
          <TextDisplay>{state.lines.join("\n")}</TextDisplay>
        </>
      ) : null}
      {state.type === "expired" ? (
        <>
          <Separator divider />
          <TextDisplay>
            {knock.anonymous
              ? `Nikt nie otworzył. Postać w masce znika w ciemności z pustym workiem.`
              : `Nikt nie otworzył. ${userMention(knock.knockerId)} odchodzi z pustym workiem.`}
          </TextDisplay>
        </>
      ) : null}
    </Container>
  );
};

const rollLabels = {
  success: "udany psikus",
  backfire: "odbity psikus",
  loot: "łup",
  steal: "kradzież",
  double: "podwójny psikus",
  candies: "garść cukierków",
  golden: "złoty kapsel",
} satisfies Record<TrickOutcome, string>;

const describeMute = (
  mute: TotMuteResolution,
  applied: ReadonlySet<string>,
  sourceOf: (userId: string) => string,
): string[] => {
  const who = userMention(mute.userId);
  switch (mute.kind) {
    case "muted":
      return [
        applied.has(mute.userId)
          ? `${who} dostaje ${mute.minutes} ${minutes(mute.minutes)} wyciszenia.`
          : `Nie udało się wyciszyć ${who}, więc tym razem się upiekło.`,
      ];
    case "blocked":
      return [`${who} ma przy sobie czosnek, więc wyciszenie przepada.`];
    case "spared":
      return [`${who} ma już dość psikusów na dziś, więc obejdzie się bez wyciszenia.`];
    case "reflected":
      return [
        `${who} wystawia lustro i psikus wraca do ${sourceOf(mute.userId)}.`,
        ...describeMute(mute.result, applied, sourceOf),
      ];
  }
};

export const describeTotAnswer = (
  knock: Halloween2026TotKnock,
  resolution: TotAnswerResolution,
  applied: ReadonlySet<string>,
): string[] => {
  const a = userMention(knock.knockerId);
  const b = userMention(knock.hostId);
  const sourceOf = (userId: string) => (userId === knock.hostId ? a : b);
  const lines: string[] = [];

  if (knock.anonymous) lines.push(`Pod maską był ${a}.`);

  const { event } = resolution;
  if (event.type === "treat") {
    lines.push(`${b} daje cukierka, a ${a} chowa go do worka.`);
  } else if (event.type === "poisoned") {
    lines.push(`${b} daje lizaka. Szkoda tylko, że był zatruty.`);
  } else {
    if (event.rolls) {
      lines.push(subtext(`Kostka: ${rollLabels[event.rolls[0]]} i ${rollLabels[event.rolls[1]]}.`));
    }
    switch (event.outcome) {
      case "success":
        lines.push(
          `Psikus się udał. ${b} będzie długo zmywać jajka z okien, a ${a} bierze cukierka za fatygę.`,
        );
        break;
      case "backfire":
        lines.push(`Psikus wybuchł ${a} w rękach. ${b} dostaje cukierka za refleks.`);
        break;
      case "double":
        lines.push("Psikus wymknął się spod kontroli i oberwało się obu stronom.");
        break;
      case "loot":
        lines.push(
          event.loot
            ? `${a} ucieka, a ${b} znajduje pod wycieraczką ${TOT_ITEMS[event.loot].accusative}.`
            : `${a} ucieka, a ${b} znajduje pod wycieraczką cukierka. Na nic więcej nie ma już miejsca w kieszeniach.`,
        );
        break;
      case "steal":
        lines.push(
          event.stolen === "candy"
            ? `${b} podbiera ${a} z worka cukierka.`
            : event.stolen
              ? `${b} podbiera ${a} z worka ${TOT_ITEMS[event.stolen].accusative}.`
              : `${b} zagląda ${a} do worka, ale w środku pusto.`,
        );
        break;
      case "candies":
        lines.push(`${a} ucieka tak szybko, że gubi garść cukierków. ${b} zbiera trzy.`);
        break;
      case "golden":
        lines.push(`${b} znajduje pod wycieraczką złoty kapsel. Trafia prosto do portfela.`);
        break;
    }
  }

  for (const mute of resolution.mutes) lines.push(...describeMute(mute, applied, sourceOf));

  return lines;
};

export const buildTotBagView = (snapshot: TotPlayerSnapshot) => {
  const items = TOT_ITEM_KEYS.filter((item) => (snapshot.items[item] ?? 0) > 0).map(
    (item) => `${formatTotItem(item)} ×${snapshot.items[item]}`,
  );
  const armed = [
    ...(snapshot.lollipopArmed ? ["Zatruty lizak czeka w misce na następnego gościa."] : []),
    ...(snapshot.maskArmed ? ["Masz na sobie maskę. Następne pukanie będzie anonimowe."] : []),
    ...snapshot.appleFuses.map(
      (fuseEndsAt) =>
        `Trzymasz zatrute jabłko, które zgnije ${time(fuseEndsAt, TimestampStyles.RelativeTime)}. Zapukaj do kogoś, a zostanie u gospodarza, gdy otworzy.`,
    ),
  ];

  return (
    <Container accentColor={TOT_COLOR}>
      <TextDisplay>
        {[
          heading("Twój worek", HeadingLevel.Three),
          `${bold(formatCandies(snapshot.candies))}`,
          items.length > 0 ? items.join("\n") : "Przedmiotów na razie brak.",
        ].join("\n")}
      </TextDisplay>
      {armed.length > 0 ? (
        <>
          <Separator divider />
          <TextDisplay>{armed.join("\n")}</TextDisplay>
        </>
      ) : null}
      <Separator divider />
      <TextDisplay>
        {snapshot.nextKnockAt
          ? `Następne pukanie ${time(snapshot.nextKnockAt, TimestampStyles.RelativeTime)}.`
          : "Możesz pukać."}
      </TextDisplay>
    </Container>
  );
};

export const buildTotShopView = () => (
  <Container accentColor={TOT_COLOR}>
    <TextDisplay>
      {[
        heading("Sklepik pod dynią", HeadingLevel.Three),
        ...TOT_ITEM_KEYS.map(
          (item) =>
            `${formatTotItem(item)}: ${bold(formatCandies(TOT_ITEMS[item].price))}\n${subtext(TOT_ITEMS[item].description)}`,
        ),
      ].join("\n")}
    </TextDisplay>
    <Separator divider />
    <TextDisplay>
      {subtext(
        `Kupujesz przez ${TOT_COMMAND} kup. Od 1 listopada wymienisz ${TOT_CANDIES_PER_KAPSEL} cukierków na kapsel przez ${TOT_COMMAND} wymien.`,
      )}
    </TextDisplay>
  </Container>
);

const passesAfter = createPluralize({ one: "podaniu", few: "podaniach", many: "podaniach" });

export const describeTotAppleSeeded = (fuseEndsAt: Date) =>
  `W worku znajdujesz zatrute jabłko. Zgnije ${time(fuseEndsAt, TimestampStyles.RelativeTime)}, więc pozbądź się go wcześniej: przy następnym pukaniu zostanie u osoby, która Ci otworzy.`;

export const describeTotAppleReceived = (guildName: string, fuseEndsAt: Date) =>
  [
    heading("Zatrute jabłko", HeadingLevel.Three),
    `Ktoś podrzucił Ci zatrute jabłko na serwerze ${bold(guildName)}.`,
    `Zgnije ${time(fuseEndsAt, TimestampStyles.RelativeTime)}. Zapukaj do kogoś przez /zapukaj, a jabłko zostanie u gospodarza, gdy otworzy.`,
  ].join("\n");

export const describeTotApplePassed = (reward: number) =>
  `Zatrute jabłko zostało u gospodarza. Za odwagę dostajesz ${formatCandies(reward)}.`;

export const describeTotAppleBite = (
  apple: { holderId: string; passes: number },
  bite: { mute: TotMuteResolution; candiesLost: number },
  applied: ReadonlySet<string>,
): string[] => {
  const who = userMention(apple.holderId);
  return [
    apple.passes > 0
      ? `🍎 Zatrute jabłko gnije w rękach ${who} po ${apple.passes} ${passesAfter(apple.passes)}.`
      : `🍎 Zatrute jabłko gnije w rękach ${who}, zanim ktokolwiek zdążył je podać dalej.`,
    ...describeMute(bite.mute, applied, () => who),
    ...(bite.candiesLost > 0 ? [`${who} traci ${formatCandies(bite.candiesLost)}.`] : []),
  ];
};
