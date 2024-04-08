import {
  type CacheType,
  ChatInputCommandInteraction,
  SlashCommandUserOption,
  User,
} from "discord.js";
import type { If, OptionBuilder } from "../types";

export class UserOptionBuilder<
  HasDescription extends boolean = false,
  Required extends boolean = true,
> implements OptionBuilder<Required, User>
{
  declare _: { type: If<Required, User, User | null> };
  // Enforce nominal typing
  protected declare readonly nominal: [HasDescription, Required];
  #builder = new SlashCommandUserOption().setRequired(true);

  setDescription(description: string): UserOptionBuilder<true, Required> {
    this.#builder.setDescription(description);
    return this as ReturnType<typeof this.setDescription>;
  }

  setRequired<NewRequired extends boolean>(
    required: NewRequired,
  ): UserOptionBuilder<HasDescription, NewRequired> {
    this.#builder.setRequired(required);
    return this as unknown as UserOptionBuilder<HasDescription, NewRequired>;
  }

  toSlashCommandOption() {
    return this.#builder;
  }

  async transform(interaction: ChatInputCommandInteraction<CacheType>, name: string) {
    return interaction.options.getUser(
      name,
      this.#builder.required,
    ) as this["_"]["type"];
  }
}
