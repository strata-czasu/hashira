import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  type ButtonInteraction,
  type CollectorFilter,
  ComponentType,
  type Message,
} from "discord.js";

import type { Duration } from "date-fns";
import { durationToMilliseconds } from "./duration";

type ButtonFilter = CollectorFilter<[ButtonInteraction]>;

type BaseResult = {
  component: ButtonComponent;
  editButton: (
    fn: (builder: ButtonBuilder) => Promise<ButtonBuilder> | ButtonBuilder,
  ) => Promise<void>;
};

type Result = BaseResult & ({ interaction: ButtonInteraction } | { interaction: null });

function ok(interaction: ButtonInteraction, component: ButtonComponent): Result {
  return {
    interaction,
    component,
    editButton(fn) {
      return editButton(interaction.message, component, fn);
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
  };
}

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

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: durationToMilliseconds(timeout),
    filter,
  });

  return new Promise<Result>((resolve) => {
    collector.on("collect", (interaction) => {
      collector.stop();
      resolve(ok(interaction, component));
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") {
        resolve(err(component, message));
      }
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
