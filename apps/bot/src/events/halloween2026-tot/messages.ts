import { type Client, RESTJSONErrorCodes } from "discord.js";

import type { Halloween2026TotKnock } from "@hashira/db";
import { render } from "@hashira/jsx";

import { discordTry } from "../../util/discordTry";
import { buildTotPorchView } from "./views";

type FinishedState = { type: "answered"; lines: string[] } | { type: "expired" };

const editMessage = async (
  client: Client,
  channelId: string,
  messageId: string,
  content: ReturnType<typeof render>,
) =>
  discordTry(
    async () => {
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return;
      await channel.messages.edit(messageId, { ...content, allowedMentions: { parse: [] } });
    },
    [
      RESTJSONErrorCodes.UnknownChannel,
      RESTJSONErrorCodes.UnknownMessage,
      RESTJSONErrorCodes.MissingAccess,
      RESTJSONErrorCodes.MissingPermissions,
    ],
    (error) => console.warn(`Failed to edit Halloween 2026 knock message ${messageId}`, error),
  );

export const finishTotKnockMessages = async (
  client: Client,
  knock: Halloween2026TotKnock,
  state: FinishedState,
) => {
  if (!knock.messageId) return;
  await editMessage(
    client,
    knock.channelId,
    knock.messageId,
    render(buildTotPorchView({ knock, state })),
  );
};
