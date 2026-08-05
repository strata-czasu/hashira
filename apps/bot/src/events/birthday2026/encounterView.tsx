/** @jsxImportSource @hashira/jsx */
import {
  ActionRow,
  Br,
  Button,
  Container,
  H1,
  Separator,
  TextDisplay,
} from "@hashira/jsx";
import { ButtonStyle, roleMention, userMention } from "discord.js";

export const BIRTHDAY_2026_ENCOUNTER_CUSTOM_ID = "birthday2026-encounter";

export const buildBirthday2026EncounterView = (input: {
  id: number;
  kind: "quickGrab" | "teamThreshold";
  disabled: boolean;
  winnerUserId: string | null;
  teamProgress: {
    roleId: string;
    progress: number;
    threshold: number;
    completed: boolean;
  }[];
}) => (
  <Container accentColor={input.kind === "quickGrab" ? 0xffd700 : 0xf5a623}>
    <TextDisplay>
      <H1>
        {input.kind === "quickGrab" ? "⚡ Szybka Pasza" : "🤝 Drużynowy transport"}
      </H1>
      <Br />
      {input.kind === "quickGrab" ? (
        input.winnerUserId ? (
          <>Nagrodę zdobywa {userMention(input.winnerUserId)}!</>
        ) : (
          "Pierwsza uprawniona osoba zdobywa Paszę. Zwycięstwa są limitowane."
        )
      ) : (
        "Każda drużyna zdobywa nagrodę po udziale wymaganej liczby różnych osób."
      )}
    </TextDisplay>
    {input.teamProgress.length > 0 ? (
      <>
        <Separator divider />
        <TextDisplay>
          {input.teamProgress
            .map(
              (team) =>
                `${roleMention(team.roleId)} — ${team.progress}/${team.threshold}${team.completed ? " ✅" : ""}`,
            )
            .join("\n")}
        </TextDisplay>
      </>
    ) : null}
    <ActionRow>
      <Button
        customId={`${BIRTHDAY_2026_ENCOUNTER_CUSTOM_ID}:${input.id}`}
        disabled={input.disabled}
        emoji="🥕"
        label={input.disabled ? "Zakończone" : "Biorę udział"}
        style={ButtonStyle.Primary}
      />
    </ActionRow>
  </Container>
);
