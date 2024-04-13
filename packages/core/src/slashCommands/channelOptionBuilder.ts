import {
  type ApplicationCommandOptionAllowedChannelTypes,
  type CacheType,
  type Channel,
  type ChannelType,
  type ChatInputCommandInteraction,
  SlashCommandChannelOption,
} from "discord.js";
import type { If, OptionBuilder } from "../types";

// ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory, ChannelType.GuildAnnouncement, ChannelType.AnnouncementThread, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildStageVoice, ChannelType.GuildForum, ChannelType.GuildMedia
type ChannelTypeToChanel<T extends ChannelType> = Extract<Channel, { type: T }>;

export class ChannelOptionBuilder<
  ChannelType extends Channel = Channel,
  HasDescription extends boolean = false,
  Required extends boolean = true,
> implements OptionBuilder<Required, ChannelType>
{
  declare _: { type: If<Required, ChannelType, ChannelType | null> };
  // Enforce nominal typing
  protected declare readonly nominal: [HasDescription, Required];
  #builder = new SlashCommandChannelOption().setRequired(true);

  setChannelType<T extends ApplicationCommandOptionAllowedChannelTypes[]>(
    ...channelTypes: T
  ): ChannelOptionBuilder<ChannelTypeToChanel<T[number]>, HasDescription, Required> {
    this.#builder.addChannelTypes(...channelTypes);
    return this as ReturnType<typeof this.setChannelType>;
  }

  setDescription(
    description: string,
  ): ChannelOptionBuilder<ChannelType, true, Required> {
    this.#builder.setDescription(description);
    return this as ReturnType<typeof this.setDescription>;
  }

  setRequired<NewRequired extends boolean>(
    required: NewRequired,
  ): ChannelOptionBuilder<ChannelType, HasDescription, NewRequired> {
    this.#builder.setRequired(required);
    return this as unknown as ReturnType<typeof this.setRequired<NewRequired>>;
  }

  toSlashCommandOption() {
    return this.#builder;
  }

  async transform(interaction: ChatInputCommandInteraction<CacheType>, name: string) {
    return interaction.options.getChannel(
      name,
      this.#builder.required,
    ) as this["_"]["type"];
  }
}
