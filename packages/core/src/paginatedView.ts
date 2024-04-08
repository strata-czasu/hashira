import type { CountSelect, Paginate } from "@hashira/db";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  type CacheType,
  ChatInputCommandInteraction,
  type CollectorFilter,
  ComponentType,
  InteractionResponse,
} from "discord.js";
import type { PgSelect } from "drizzle-orm/pg-core";
import { match } from "ts-pattern";

type CreateFilter = (
  interaction: ChatInputCommandInteraction<CacheType>,
) => CollectorFilter<[ButtonInteraction]>;

type ItemType<T extends Paginate<PgSelect, CountSelect>> = T extends Paginate<
  infer U,
  CountSelect
>
  ? U["_"]["result"][number]
  : never;

type RenderItem<T extends Paginate<PgSelect, CountSelect>> = (
  item: ItemType<T>,
  index: number,
) => Promise<string> | string;

const createAuthorFilter: CreateFilter = (interaction) => (action) =>
  action.user.id === interaction.user.id;

export class PaginatedView<T extends Paginate<PgSelect, CountSelect>> {
  readonly #paginate: T;
  #message?: InteractionResponse<boolean>;
  readonly #interaction: ChatInputCommandInteraction<CacheType>;
  #items: ItemType<T>[] = [];
  #title?: string = undefined;
  readonly #renderItem: RenderItem<T>;
  constructor(
    interaction: ChatInputCommandInteraction<CacheType>,
    paginate: T,
    title: string,
    renderItem: RenderItem<T>,
  ) {
    this.#paginate = paginate;
    this.#interaction = interaction;
    this.#title = title;
    this.#renderItem = renderItem;
  }

  private async send() {
    if (!this.#message) {
      this.#message = await this.#interaction.reply({ content: "Loading..." });
    }
    await this.render();
  }

  async render() {
    if (!this.#message) return await this.send();
    this.#items = (await this.#paginate.current()) as ItemType<T>[];

    const displayPages = this.#paginate.displayPages;
    const displayCurrentPage = this.#paginate.displayCurrentPage;

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Previous")
        .setCustomId("previous")
        .setDisabled(!this.#paginate.canPrevious)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel("Next")
        .setCustomId("next")
        .setDisabled(!this.#paginate.canNext)
        .setStyle(ButtonStyle.Primary),
    );

    const renderedItems = await Promise.all(
      this.#items.map((item, index) =>
        this.#renderItem(item, index + this.#paginate.currentOffset),
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
        filter: createAuthorFilter(this.#interaction),
        time: 60_000,
      });

      const newItems = await match(buttonAction)
        .with({ customId: "previous" }, async () => await this.#paginate.previous())
        .with({ customId: "next" }, async () => await this.#paginate.next())
        .run();

      this.#items = newItems as ItemType<T>[];

      buttonAction.deferUpdate();
      await this.render();
    } catch (error) {
      // Handle timeout
      await this.#message.edit({ components: [] });
    }
  }
}
