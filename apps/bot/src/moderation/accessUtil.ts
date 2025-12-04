import {
  bold,
  channelMention,
  italic,
  TimestampStyles,
  time,
  type User,
} from "discord.js";

const CHANNEL_RESTRICTION_TEMPLATE = `
## Hejka {{user}}!
Przed chwilą {{moderator}} odebrał Ci dostęp do kanału {{channel}}.

**Oto powód odebrania dostępu:**
{{reason}}

{{duration_info}}

Przeczytaj proszę nasze Zasady dostępne pod [tym linkiem](https://discord.com/channels/211261411119202305/873167662082056232/1270484486131290255) i jeżeli nie zgadzasz się z powodem odebrania dostępu, to odwołaj się od niego klikając czerwony przycisk "Odwołaj się" na naszym [kanale od ticketów](https://discord.com/channels/211261411119202305/1213901611836117052/1219338768012804106). W odwołaniu spinguj nick osoby, która odebrała Ci dostęp.

Pozdrawiam,
Biszkopt`;

const CHANNEL_RESTRICTION_RESTORE_TEMPLATE = `
## Hejka {{user}}!
To znowu ja! Przed chwilą przywrócono Ci dostęp do kanału {{channel}}.

{{restore_reason}}

Życzę Ci miłego dnia i jeszcze raz pozdrawiam!

Pozdrawiam,
Biszkopt`;

export const composeChannelRestrictionMessage = (
  user: User,
  moderator: User,
  channelName: string,
  reason: string,
  endsAt: Date | null,
) => {
  const durationInfo = endsAt
    ? `Dostęp zostanie automatycznie przywrócony ${time(endsAt, TimestampStyles.RelativeTime)}.`
    : "To odebranie dostępu jest permanentne i może zostać przywrócone tylko ręcznie przez moderację.";

  return CHANNEL_RESTRICTION_TEMPLATE.replace("{{user}}", user.toString())
    .replace("{{moderator}}", `${moderator} (${moderator.tag})`)
    .replace("{{channel}}", bold(channelName))
    .replace("{{reason}}", italic(reason))
    .replace("{{duration_info}}", durationInfo);
};

export const composeChannelRestrictionRestoreMessage = (
  user: { toString(): string; id: string },
  channelId: string,
  restoreReason: string | null,
) => {
  const reasonInfo = restoreReason
    ? `**Powód przywrócenia:** ${italic(restoreReason)}`
    : "Dostęp został przywrócony automatycznie po upływie czasu blokady.";

  return CHANNEL_RESTRICTION_RESTORE_TEMPLATE.replace("{{user}}", user.toString())
    .replace("{{channel}}", channelMention(channelId))
    .replace("{{restore_reason}}", reasonInfo);
};
