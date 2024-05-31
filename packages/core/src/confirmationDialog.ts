import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type CacheType,
  type ChatInputCommandInteraction,
  type CollectorFilter,
  ComponentType,
  type Message,
} from "discord.js";
import { match } from "ts-pattern";

type DialogCallback = () => Promise<void>;
type DialogFilter = CollectorFilter<[ButtonInteraction]>;

export class ConfirmationDialog {
  #message?: Message<boolean>;
  readonly #title: string;
  readonly #acceptMessage: string;
  readonly #declineMessage: string;
  readonly #acceptCallback: DialogCallback;
  readonly #declineCallback: DialogCallback;
  readonly #filter: DialogFilter;

  constructor(
    title: string,
    acceptMessage: string,
    declineMessage: string,
    acceptCallback: DialogCallback,
    declineCallback: DialogCallback,
    filter: DialogFilter,
  ) {
    this.#title = title;
    this.#acceptMessage = acceptMessage;
    this.#declineMessage = declineMessage;
    this.#acceptCallback = acceptCallback;
    this.#declineCallback = declineCallback;
    this.#filter = filter;
  }

  private async send(interaction: ChatInputCommandInteraction<CacheType>) {
    const buttons = [
      new ButtonBuilder()
        .setLabel(this.#acceptMessage)
        .setCustomId("accept")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel(this.#declineMessage)
        .setCustomId("decline")
        .setStyle(ButtonStyle.Danger),
    ];
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    if (interaction.deferred && !this.#message) {
      this.#message = await interaction.editReply({
        content: this.#title,
        components: [actionRow],
      });
    } else if (!this.#message) {
      this.#message = await interaction.reply({
        content: this.#title,
        components: [actionRow],
        fetchReply: true,
      });
    }

    await this.render(interaction);
  }

  async render(interaction: ChatInputCommandInteraction<CacheType>) {
    if (!this.#message) return await this.send(interaction);

    try {
      const buttonAction = await this.#message.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: this.#filter,
        time: 60_000,
      });

      await match(buttonAction.customId)
        .with("accept", this.#acceptCallback)
        .with("decline", this.#declineCallback)
        .run();
    } catch (error) {
      // Handle timeout
      await this.#message.edit({ components: [] });
    }
  }
}
