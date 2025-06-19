import {
  type AutocompleteInteraction,
  type CacheType,
  type ChatInputCommandInteraction,
  type Role,
  SlashCommandRoleOption,
} from "discord.js";
import type { If, OptionBuilder } from "../types";

export class RoleOptionBuilder<
  HasDescription extends boolean = false,
  Required extends boolean = true,
> implements OptionBuilder<Required, Role>
{
  declare _: { type: If<Required, Role, Role | null> };
  // Enforce nominal typing
  protected declare readonly nominal: [HasDescription, Required];
  #builder = new SlashCommandRoleOption().setRequired(true);

  setDescription(description: string): RoleOptionBuilder<true, Required> {
    this.#builder.setDescription(description);
    return this as ReturnType<typeof this.setDescription>;
  }

  setRequired<NewRequired extends boolean>(
    required: NewRequired,
  ): RoleOptionBuilder<HasDescription, NewRequired> {
    this.#builder.setRequired(required);
    return this as unknown as ReturnType<typeof this.setRequired<NewRequired>>;
  }

  toSlashCommandOption() {
    return this.#builder;
  }

  async transform(
    interaction:
      | ChatInputCommandInteraction<CacheType>
      | AutocompleteInteraction<CacheType>,
    name: string,
  ) {
    if (interaction.isAutocomplete()) return null as this["_"]["type"];
    return interaction.options.getRole(
      name,
      this.#builder.required,
    ) as this["_"]["type"];
  }
}
