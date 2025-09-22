import {
  ActionRowBuilder,
  type BaseMessageOptions,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type CollectorFilter,
  ComponentType,
  type Message,
} from "discord.js";

type DialogCallback = () => Promise<void>;
type DialogFilter = CollectorFilter<[ButtonInteraction]>;

type StubInteraction = {
  send(components: BaseMessageOptions): Promise<Message<boolean>>;
};

export class ConfirmationDialog {
  #message?: Message<boolean>;
  readonly #title: string;
  readonly #acceptMessage: string;
  readonly #declineMessage: string;
  readonly #acceptCallback: DialogCallback;
  readonly #declineCallback: DialogCallback;
  readonly #filter: DialogFilter;
  readonly #timeoutCallback: DialogCallback | null;

  constructor(
    title: string,
    acceptMessage: string,
    declineMessage: string,
    acceptCallback: DialogCallback,
    declineCallback: DialogCallback,
    filter: DialogFilter,
    timeoutCallback: DialogCallback | null = null,
  ) {
    this.#title = title;
    this.#acceptMessage = acceptMessage;
    this.#declineMessage = declineMessage;
    this.#acceptCallback = acceptCallback;
    this.#declineCallback = declineCallback;
    this.#filter = filter;
    this.#timeoutCallback = timeoutCallback;
  }

  private async send(interaction: StubInteraction) {
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

    if (!this.#message) {
      this.#message = await interaction.send({
        content: this.#title,
        components: [actionRow],
      });
    }

    await this.render(interaction);
  }

  async render(interaction: StubInteraction) {
    if (!this.#message) return await this.send(interaction);

    try {
      const buttonAction = await this.#message.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: this.#filter,
        time: 60_000,
      });

      await this.runCallback(buttonAction.customId);
    } catch (error) {
      // Handle timeout
      if (this.#timeoutCallback) {
        await this.#timeoutCallback();
      }

      await this.#message.edit({ components: [] });
    }
  }

  private async runCallback(customId: string) {
    if (customId === "accept") return await this.#acceptCallback();

    return await this.#declineCallback();
  }
}

/**
 * Displays a confirmation dialog to the user and waits for their response.
 *
 * @example
 * // Example usage with Discord.js interaction
 * const confirmation = await waitForConfirmation(
 *   { send: interaction.editReply.bind(interaction) },
 *   "Are you sure you want to send this message?",
 *   "Yes",
 *   "No",
 *   (action) => action.user.id === interaction.user.id
 * );
 *
 * if (confirmation) {
 *   await interaction.editReply("Proceeding with operation...");
 * } else {
 *   await interaction.editReply("Operation cancelled.");
 * }
 */
export function waitForConfirmation(
  interaction: StubInteraction,
  title: string,
  acceptMessage: string,
  declineMessage: string,
  filter: DialogFilter,
): Promise<boolean> {
  return new Promise((resolve) => {
    const acceptCallback = async () => {
      resolve(true);
    };

    const declineCallback = async () => {
      resolve(false);
    };

    const confirmationDialog = new ConfirmationDialog(
      title,
      acceptMessage,
      declineMessage,
      acceptCallback,
      declineCallback,
      filter,
      declineCallback,
    );

    confirmationDialog.render(interaction);
  });
}
