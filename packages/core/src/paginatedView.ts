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
import { match } from "ts-pattern";

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
  #title?: string = undefined;
  #orderingEnabled: boolean;
  readonly #renderItem: RenderItem<T>;
  constructor(
    paginate: Paginator<T>,
    title: string,
    renderItem: RenderItem<T>,
    orderingEnabled = false,
  ) {
    this.#paginator = paginate;
    this.#title = title;
    this.#renderItem = renderItem;
    this.#orderingEnabled = orderingEnabled;
  }

  private async send(interaction: ChatInputCommandInteraction<CacheType>) {
    if (interaction.deferred && !this.#message) {
      this.#message = await interaction.editReply({ content: "Loading..." });
    } else if (!this.#message) {
      this.#message = await interaction.reply({
        content: "Loading...",
        fetchReply: true,
      });
    }
    await this.render(interaction);
  }

  async render(interaction: ChatInputCommandInteraction<CacheType>) {
    if (!this.#message) return await this.send(interaction);
    this.#items = await this.#paginator.current();

    const displayPages = this.#paginator.displayPages;
    const displayCurrentPage = this.#paginator.displayCurrentPage;

    const defaultButtons = [
      new ButtonBuilder()
        .setLabel("Previous")
        .setCustomId("previous")
        .setDisabled(!this.#paginator.canPrevious)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel("Next")
        .setCustomId("next")
        .setDisabled(!this.#paginator.canNext)
        .setStyle(ButtonStyle.Primary),
    ];

    const orderingButtons = this.#orderingEnabled
      ? [
          new ButtonBuilder()
            .setLabel("Order by")
            .setCustomId("orderBy")
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
          title: this.#title ?? "List of items",
          description: renderedItems.join("\n"),
          footer: { text: `Page ${displayCurrentPage}/${displayPages}` },
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

      const newItems = await match(buttonAction)
        .with({ customId: "previous" }, async () => await this.#paginator.previous())
        .with({ customId: "next" }, async () => await this.#paginator.next())
        .with({ customId: "orderBy" }, async () => await this.#paginator.reorder())
        .run();

      this.#items = newItems;

      buttonAction.deferUpdate();
      await this.render(interaction);
    } catch (error) {
      // Handle timeout
      await this.#message.edit({ components: [] });
    }
  }
}
