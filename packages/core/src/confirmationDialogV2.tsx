/** @jsxImportSource @hashira/jsx */
import { ActionRow, Button, type JSXNode, render } from "@hashira/jsx";
import {
  type BaseMessageOptions,
  type ButtonInteraction,
  ButtonStyle,
  type CollectorFilter,
  ComponentType,
  type Message,
} from "discord.js";

type ConfirmationSendCallback = {
  send(components: BaseMessageOptions): Promise<Message<boolean>>;
};

const CONFIRMATION_TIMEOUT = 60_000;

/**
 * Displays a confirmation dialog built from Components V2 and waits for the
 * user's response. The buttons are stripped once the dialog resolves, so the
 * message stays within Components V2 for its whole lifetime - callers may
 * safely edit it with rendered components afterwards.
 *
 * Resolves true on accept, false on decline or timeout.
 */
export async function waitForConfirmationV2(
  interaction: ConfirmationSendCallback,
  body: JSXNode,
  acceptMessage: string,
  declineMessage: string,
  filter: CollectorFilter<[ButtonInteraction]>,
): Promise<boolean> {
  const options = render(
    <>
      {body}
      <ActionRow>
        <Button label={acceptMessage} customId="accept" style={ButtonStyle.Primary} />
        <Button label={declineMessage} customId="decline" style={ButtonStyle.Danger} />
      </ActionRow>
    </>,
  );

  const message = await interaction.send(options);

  let accepted = false;
  try {
    const action = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter,
      time: CONFIRMATION_TIMEOUT,
    });
    await action.deferUpdate();
    accepted = action.customId === "accept";
  } catch {
    accepted = false;
  }

  await message.edit(render(body)).catch(() => {});

  return accepted;
}
