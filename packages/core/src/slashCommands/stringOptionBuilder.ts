import {
  type APIApplicationCommandOptionChoice,
  type CacheType,
  type ChatInputCommandInteraction,
  SlashCommandStringOption,
  escapeMarkdown,
} from "discord.js";
import type { OptionBuilder } from "../types";

export class StringOptionBuilder<
  HasDescription extends boolean = false,
  Required extends boolean = true,
> implements OptionBuilder<Required, string>
{
  declare _: { type: Required extends true ? string : string | null };
  // Enforce nominal typing
  protected declare readonly nominal: [HasDescription, Required];
  #builder = new SlashCommandStringOption().setRequired(true);
  #escaped = false;

  setDescription(description: string): StringOptionBuilder<true, Required> {
    this.#builder.setDescription(description);
    return this as ReturnType<typeof this.setDescription>;
  }

  setRequired<NewRequired extends boolean>(
    required: NewRequired,
  ): StringOptionBuilder<HasDescription, NewRequired> {
    this.#builder.setRequired(required);
    return this as unknown as ReturnType<typeof this.setRequired<NewRequired>>;
  }

  addChoices(...choices: APIApplicationCommandOptionChoice<string>[]) {
    this.#builder.addChoices(...choices);
    return this;
  }

  setEscaped(escaped: boolean) {
    this.#escaped = escaped;
    return this;
  }

  toSlashCommandOption() {
    return this.#builder;
  }

  async transform(interaction: ChatInputCommandInteraction<CacheType>, name: string) {
    const value = interaction.options.getString(
      name,
      this.#builder.required,
    ) as this["_"]["type"];
    if (this.#escaped && value) return escapeMarkdown(value);
    return value;
  }
}
