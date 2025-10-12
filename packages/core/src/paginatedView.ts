import type { Paginator } from "@hashira/paginate";
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

type CreateFilter = (
  interaction: ChatInputCommandInteraction<CacheType>,
) => CollectorFilter<[ButtonInteraction]>;

type RenderItem<T> = (item: T, index: number) => Promise<string> | string;

const createAuthorFilter: CreateFilter = (interaction) => (action) =>
  action.user.id === interaction.user.id;

export class PaginatedView<T> {
  readonly #paginator: Paginator<T>;
  #message?: Message<boolean>;
  #items: T[] = [];
  readonly #title?: string = undefined;
  readonly #orderingEnabled: boolean;
  readonly #footerExtra: string | null;
  readonly #renderItem: RenderItem<T>;

  constructor(
    paginate: Paginator<T>,
    title: string,
    renderItem: RenderItem<T>,
    orderingEnabled = false,
    footerExtra: string | null = null,
  ) {
    this.#paginator = paginate;
    this.#title = title;
    this.#renderItem = renderItem;
    this.#orderingEnabled = orderingEnabled;
    this.#footerExtra = footerExtra;
  }

  private async send(interaction: ChatInputCommandInteraction<CacheType>) {
    const content = "Ładowanie...";
    if (interaction.deferred && !this.#message) {
      this.#message = await interaction.editReply({ content });
    } else if (!this.#message) {
      const { resource } = await interaction.reply({ content, withResponse: true });
      if (!resource?.message) {
        throw new Error(
          "Message resource not fetched after initial PaginatedView reply",
        );
      }
      this.#message = resource.message;
    }
    await this.render(interaction);
  }

  async render(interaction: ChatInputCommandInteraction<CacheType>) {
    if (!this.#message) return await this.send(interaction);
    this.#items = await this.#paginator.current();

    const defaultButtons = [
      new ButtonBuilder()
        .setEmoji("⬅️")
        .setCustomId("previous")
        .setDisabled(!this.#paginator.canPrevious)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setEmoji("➡️")
        .setCustomId("next")
        .setDisabled(!this.#paginator.canNext)
        .setStyle(ButtonStyle.Primary),
    ];

    const orderingButtons = this.#orderingEnabled
      ? [
          new ButtonBuilder()
            .setLabel("Order by")
            .setCustomId("reorder")
            .setStyle(ButtonStyle.Secondary),
        ]
      : [];

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents([
      ...defaultButtons,
      ...orderingButtons,
    ]);

    const renderedItems = await Promise.all(
      this.#items.map((item, index) =>
        this.#renderItem(item, index + this.#paginator.currentOffset + 1),
      ),
    );

    await this.#message.edit({
      content: "",
      embeds: [
        {
          title: this.#title ?? "Lista",
          description: renderedItems.join("\n"),
          footer: { text: this.getFooter() },
        },
      ],
      components: [actionRow],
    });

    try {
      const buttonAction = await this.#message.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: createAuthorFilter(interaction),
        time: 60_000,
      });

      this.#items = await this.getNewItems(buttonAction.customId);

      buttonAction.deferUpdate();

      await this.render(interaction);
    } catch (_) {
      // Handle timeout
      // TODO)) More specific error handling
      await this.finalize();
    }
  }

  private async finalize() {
    try {
      await this.#message?.edit({ components: [] });
    } catch (e) {
      console.error(`Error finalizing PaginatedView ${this.#title}:`, e);
    }
  }

  private async getNewItems(buttonType: string) {
    if (buttonType === "previous") return await this.#paginator.previous();
    if (buttonType === "next") return await this.#paginator.next();
    if (buttonType === "reorder") return await this.#paginator.reorder();

    throw new Error(`Unknown button type: ${buttonType}`);
  }

  private getFooter() {
    const displayPages = this.#paginator.displayPages;
    const displayCurrentPage = this.#paginator.displayCurrentPage;
    let footer = `Strona ${displayCurrentPage}/${displayPages}`;
    if (this.#paginator.count) {
      footer += ` (${this.#paginator.count})`;
    }
    if (this.#footerExtra) {
      footer += ` | ${this.#footerExtra}`;
    }
    return footer;
  }
}
