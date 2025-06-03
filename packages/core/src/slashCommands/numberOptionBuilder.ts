import {
  type APIApplicationCommandOptionChoice,
  type CacheType,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  SlashCommandNumberOption,
} from "discord.js";
import type { If, OptionBuilder } from "../types";

export class NumberOptionBuilder<
  HasDescription extends boolean = false,
  Required extends boolean = true,
> implements OptionBuilder<Required, number>
{
  declare _: { type: If<Required, number, number | null> };
  // Enforce nominal typing
  protected declare readonly nominal: [HasDescription, Required];
  #builder = new SlashCommandNumberOption().setRequired(true);

  setDescription(description: string): NumberOptionBuilder<true, Required> {
    this.#builder.setDescription(description);
    return this as ReturnType<typeof this.setDescription>;
  }

  setRequired<NewRequired extends boolean>(
    required: NewRequired,
  ): NumberOptionBuilder<HasDescription, NewRequired> {
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

  setAutocomplete(autocomplete: boolean) {
    this.#builder.setAutocomplete(autocomplete);
    return this;
  }

  addChoices(...choices: APIApplicationCommandOptionChoice<number>[]) {
    this.#builder.addChoices(...choices);
    return this;
  }

  toSlashCommandOption() {
    return this.#builder;
  }

  async transform(
    interaction: ChatInputCommandInteraction<CacheType> | AutocompleteInteraction<CacheType>,
    name: string,
  ) {
    return interaction.options.getNumber(
      name,
      this.#builder.required,
    ) as this["_"]["type"];
  }
}
