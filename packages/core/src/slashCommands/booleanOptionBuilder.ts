import {
  type CacheType,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  SlashCommandBooleanOption,
} from "discord.js";
import type { If, OptionBuilder } from "../types";

export class BooleanOptionBuilder<
  HasDescription extends boolean = false,
  Required extends boolean = true,
> implements OptionBuilder<Required, boolean>
{
  declare _: { type: If<Required, boolean, boolean | null> };
  // Enforce nominal typing
  protected declare readonly nominal: [HasDescription, Required];
  #builder = new SlashCommandBooleanOption().setRequired(true);

  setDescription(description: string): BooleanOptionBuilder<true, Required> {
    this.#builder.setDescription(description);
    return this as ReturnType<typeof this.setDescription>;
  }

  setRequired<NewRequired extends boolean>(
    required: NewRequired,
  ): BooleanOptionBuilder<HasDescription, NewRequired> {
    this.#builder.setRequired(required);
    return this as unknown as ReturnType<typeof this.setRequired<NewRequired>>;
  }

  toSlashCommandOption() {
    return this.#builder;
  }

  async transform(
    interaction: ChatInputCommandInteraction<CacheType> | AutocompleteInteraction<CacheType>,
    name: string,
  ) {
    return interaction.options.getBoolean(
      name,
      this.#builder.required,
    ) as this["_"]["type"];
  }
}
