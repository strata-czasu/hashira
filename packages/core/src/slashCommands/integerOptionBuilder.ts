import {
  type APIApplicationCommandOptionChoice,
  type CacheType,
  type ChatInputCommandInteraction,
  SlashCommandIntegerOption,
} from "discord.js";
import type { If, OptionBuilder } from "../types";

export class IntegerOptionBuilder<
  HasDescription extends boolean = false,
  Required extends boolean = true,
> implements OptionBuilder<Required, number>
{
  declare _: { type: If<Required, number, number | null> };
  // Enforce nominal typing
  protected declare readonly nominal: [HasDescription, Required];
  #builder = new SlashCommandIntegerOption().setRequired(true);

  setDescription(description: string): IntegerOptionBuilder<true, Required> {
    this.#builder.setDescription(description);
    return this as ReturnType<typeof this.setDescription>;
  }

  setRequired<NewRequired extends boolean>(
    required: NewRequired,
  ): IntegerOptionBuilder<HasDescription, NewRequired> {
    this.#builder.setRequired(required);
    return this as unknown as ReturnType<typeof this.setRequired<NewRequired>>;
  }

  setMinValue(min: number): this {
    this.#builder.setMinValue(min);
    return this;
  }

  setMaxValue(max: number): this {
    this.#builder.setMaxValue(max);
    return this;
  }

  addChoices(...choices: APIApplicationCommandOptionChoice<number>[]) {
    this.#builder.addChoices(...choices);
    return this;
  }

  toSlashCommandOption() {
    return this.#builder;
  }

  async transform(interaction: ChatInputCommandInteraction<CacheType>, name: string) {
    return interaction.options.getInteger(
      name,
      this.#builder.required,
    ) as this["_"]["type"];
  }
}
