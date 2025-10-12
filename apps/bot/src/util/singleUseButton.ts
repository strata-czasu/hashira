import type { Duration } from "date-fns";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  type ButtonInteraction,
  type CollectorFilter,
  ComponentType,
  type Message,
} from "discord.js";
import { durationToMilliseconds } from "./duration";

type ButtonFilter = CollectorFilter<[ButtonInteraction]>;

type BaseResult = {
  component: ButtonComponent;
  editButton: (
    fn: (builder: ButtonBuilder) => Promise<ButtonBuilder> | ButtonBuilder,
  ) => Promise<void>;
  removeButton: () => Promise<void>;
};

type Result = BaseResult & ({ interaction: ButtonInteraction } | { interaction: null });

function ok(interaction: ButtonInteraction, component: ButtonComponent): Result {
  return {
    interaction,
    component,
    editButton(fn) {
      return editButton(interaction.message, component, fn);
    },
    removeButton() {
      return removeButton(interaction.message);
    },
  };
}

function err(component: ButtonComponent, message: Message<boolean>): Result {
  return {
    interaction: null,
    component,
    editButton(fn) {
      return editButton(message, component, fn);
    },
    removeButton() {
      return removeButton(message);
    },
  };
}

/**
 * Waits for a button click on a Discord message and returns the interaction result.
 *
 * This function creates a component collector that listens for button interactions
 * on a specific button within a message. It will resolve when the button is clicked
 * or when the timeout is reached.
 *
 * @param message - The Discord message containing the button to wait for
 * @param customId - The custom ID of the button to listen for clicks on
 * @param timeout - The duration to wait for a button click before timing out
 * @param filter - A filter function to determine which button interactions to accept
 *
 * @returns A promise that resolves to a Result object containing:
 *   - If successful: the button interaction, component, and editButton function
 *   - If timeout: null interaction, component, and editButton function
 *
 * @throws {Error} When the button with the specified customId is not found in the message
 *
 * @example
 * ```typescript
 * const result = await waitForButtonClick(
 *   message,
 *   'confirm-button',
 *   { minutes: 5 },
 *   (interaction) => interaction.user.id === userId
 * );
 *
 * if (result.interaction) {
 *   await result.interaction.reply('Button clicked!');
 * } else {
 *   console.log('Button click timed out');
 * }
 * ```
 */
export function waitForButtonClick(
  message: Message<boolean>,
  customId: string,
  timeout: Duration,
  filter: ButtonFilter,
) {
  const component = message.resolveComponent(customId);

  if (!component || !(component instanceof ButtonComponent)) {
    throw new Error(`Button with customId "${customId}" not found in message.`);
  }

  // Based on https://github.com/discordjs/discord.js/blob/8124fc68bee3e4a2e4e83240d9885abcad942fb0/packages/discord.js/src/structures/Message.js#L690
  return new Promise<Result>((resolve) => {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: durationToMilliseconds(timeout),
      max: 1,
      filter,
    });

    collector.once("end", (interactions, _) => {
      const interaction = interactions.first();
      if (interaction) resolve(ok(interaction, component));
      else resolve(err(component, message));
    });
  });
}

async function editButton(
  message: Message<boolean>,
  button: ButtonComponent,
  fn: (builder: ButtonBuilder) => Promise<ButtonBuilder> | ButtonBuilder,
) {
  const builder = await fn(ButtonBuilder.from(button));
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(builder);

  await message.edit({ components: [row] });
}

async function removeButton(message: Message<boolean>) {
  await message.edit({ components: [] });
}
