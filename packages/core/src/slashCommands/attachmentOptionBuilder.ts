import {
  type Attachment,
  type CacheType,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  SlashCommandAttachmentOption,
} from "discord.js";
import type { If, OptionBuilder } from "../types";

export class AttachmentOptionBuilder<
  HasDescription extends boolean = false,
  Required extends boolean = true,
> implements OptionBuilder<Required, Attachment>
{
  declare _: { type: If<Required, Attachment, Attachment | null> };
  // Enforce nominal typing
  protected declare readonly nominal: [HasDescription, Required];
  #builder = new SlashCommandAttachmentOption().setRequired(true);

  setDescription(description: string): AttachmentOptionBuilder<true, Required> {
    this.#builder.setDescription(description);
    return this as ReturnType<typeof this.setDescription>;
  }

  setRequired<NewRequired extends boolean>(
    required: NewRequired,
  ): AttachmentOptionBuilder<HasDescription, NewRequired> {
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
    return interaction.options.getAttachment(
      name,
      this.#builder.required,
    ) as this["_"]["type"];
  }
}
