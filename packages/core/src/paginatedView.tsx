/** @jsxImportSource @hashira/jsx */
import {
  ActionRow,
  Button,
  Container,
  H3,
  type JSXNode,
  render,
  Separator,
  TextDisplay,
} from "@hashira/jsx";
import { type Paginator, PaginatorOrder } from "@hashira/paginate";
import {
  type ButtonInteraction,
  ButtonStyle,
  type CacheType,
  type ChatInputCommandInteraction,
  ComponentType,
  type Message,
} from "discord.js";

type RenderItem<T> = (item: T, index: number) => Promise<JSXNode> | JSXNode;
type HandleButtonInteraction = (interaction: ButtonInteraction) => Promise<void>;

function PaginatedViewComponent({
  title,
  items,
  footer,
}: {
  title: string;
  items: JSXNode[];
  footer: string;
}) {
  return (
    <Container>
      <TextDisplay>
        <H3>{title}</H3>
      </TextDisplay>
      {items}
      <Separator />
      <TextDisplay content={footer} />
    </Container>
  );
}

function PaginatedViewButtons({
  canPrev,
  canNext,
  orderingEnabled,
  ordering,
}: {
  canPrev: boolean;
  canNext: boolean;
  orderingEnabled: boolean;
  ordering: PaginatorOrder;
}) {
  return (
    <ActionRow>
      <Button
        emoji="⬅️"
        customId="paginated-view:previous"
        disabled={!canPrev}
        style={ButtonStyle.Primary}
      />
      <Button
        emoji="➡️"
        customId="paginated-view:next"
        disabled={!canNext}
        style={ButtonStyle.Primary}
      />
      {orderingEnabled && (
        <Button
          label={ordering === PaginatorOrder.DESC ? "🔽" : "🔼"}
          customId="paginated-view:reorder"
          style={ButtonStyle.Secondary}
        />
      )}
    </ActionRow>
  );
}

export class PaginatedView<T> {
  readonly #paginator: Paginator<T>;
  readonly #title: string;
  readonly #orderingEnabled: boolean;
  readonly #footerExtra: string | null;
  readonly #renderItem: RenderItem<T>;
  readonly #handleOtherButton: HandleButtonInteraction | null;
  #message?: Message<boolean>;

  constructor(
    paginator: Paginator<T>,
    title: string,
    renderItem: RenderItem<T>,
    orderingEnabled = false,
    footerExtra: string | null = null,
    handleOtherButton: HandleButtonInteraction | null = null,
  ) {
    this.#paginator = paginator;
    this.#title = title;
    this.#renderItem = renderItem;
    this.#orderingEnabled = orderingEnabled;
    this.#footerExtra = footerExtra;
    this.#handleOtherButton = handleOtherButton;
  }

  async render(interaction: ChatInputCommandInteraction<CacheType>) {
    if (!this.#message) {
      this.#message = await this.#initMessage(interaction);
    }

    await this.#updateMessage(true);
    await this.#awaitInteraction(interaction);
  }

  async #initMessage(interaction: ChatInputCommandInteraction<CacheType>) {
    const options = render(<TextDisplay content="Ładowanie..." />);

    if (interaction.deferred) {
      return interaction.editReply(options);
    }

    const { resource } = await interaction.reply({
      components: options.components,
      withResponse: true,
      flags: "IsComponentsV2",
    });

    if (!resource?.message) {
      throw new Error("Message resource not fetched after initial PaginatedView reply");
    }

    return resource.message;
  }

  async #updateMessage(showButtons: boolean) {
    const items = await this.#paginator.current();
    const renderedItems = await Promise.all(
      items.map(async (item, idx) => {
        const rendered = await this.#renderItem(
          item,
          idx + this.#paginator.currentOffset + 1,
        );
        if (typeof rendered === "string") {
          return <TextDisplay content={rendered} />;
        }
        return rendered;
      }),
    );

    const output = render(
      <>
        <PaginatedViewComponent
          title={this.#title}
          items={renderedItems}
          footer={this.#getFooter()}
        />
        {showButtons && (
          <PaginatedViewButtons
            canPrev={this.#paginator.canPrevious}
            canNext={this.#paginator.canNext}
            orderingEnabled={this.#orderingEnabled}
            ordering={this.#paginator.ordering}
          />
        )}
      </>,
    );

    await this.#message?.edit(output);
  }

  async #awaitInteraction(interaction: ChatInputCommandInteraction<CacheType>) {
    try {
      const action = await this.#message?.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 60_000,
      });

      if (!action) return;

      action.deferUpdate();

      if (action.customId.startsWith("paginated-view:")) {
        await this.#handleButton(action.customId);
      } else if (this.#handleOtherButton) {
        await this.#handleOtherButton(action);
      } else {
        throw new Error(`Unknown button: ${action.customId}`);
      }

      await this.render(interaction);
    } catch {
      await this.#finalize();
    }
  }

  async #handleButton(customId: string) {
    switch (customId) {
      case "paginated-view:previous":
        await this.#paginator.previous();
        break;
      case "paginated-view:next":
        await this.#paginator.next();
        break;
      case "paginated-view:reorder":
        await this.#paginator.reorder();
        break;
      default:
        throw new Error(`Unknown button: ${customId}`);
    }
  }

  async #finalize() {
    try {
      await this.#updateMessage(false);
    } catch (e) {
      console.error(`Error finalizing PaginatedView ${this.#title}:`, e);
    }
  }

  #getFooter() {
    const { displayCurrentPage, displayPages, count } = this.#paginator;

    let footer = `Strona ${displayCurrentPage}/${displayPages}`;
    if (count) footer += ` (${count})`;
    if (this.#footerExtra) footer += ` | ${this.#footerExtra}`;

    return footer;
  }
}
