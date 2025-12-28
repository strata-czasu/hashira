import {
  ActionRow,
  Button,
  Container,
  render,
  Separator,
  TextDisplay,
} from "@hashira/jsx";
import type { Paginator } from "@hashira/paginate";
import {
  ButtonStyle,
  type CacheType,
  type ChatInputCommandInteraction,
  ComponentType,
  type Message,
} from "discord.js";

type RenderItem<T> = (item: T, index: number) => Promise<string> | string;

function PaginatedViewComponent({
  title,
  items,
  footer,
}: {
  title: string;
  items: string[];
  footer: string;
}) {
  return (
    <Container>
      <TextDisplay content={`# ${title}`} />
      <TextDisplay content={items.join("\n")} />
      <Separator />
      <TextDisplay content={footer} />
    </Container>
  );
}

function PaginatedViewButtons({
  canPrev,
  canNext,
  orderingEnabled,
}: {
  canPrev: boolean;
  canNext: boolean;
  orderingEnabled: boolean;
}) {
  return (
    <ActionRow>
      <Button
        emoji="⬅️"
        customId="previous"
        disabled={!canPrev}
        style={ButtonStyle.Primary}
      />
      <Button
        emoji="➡️"
        customId="next"
        disabled={!canNext}
        style={ButtonStyle.Primary}
      />
      {orderingEnabled && (
        <Button label="Order by" customId="reorder" style={ButtonStyle.Secondary} />
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
  #message?: Message<boolean>;

  constructor(
    paginator: Paginator<T>,
    title: string,
    renderItem: RenderItem<T>,
    orderingEnabled = false,
    footerExtra: string | null = null,
  ) {
    this.#paginator = paginator;
    this.#title = title;
    this.#renderItem = renderItem;
    this.#orderingEnabled = orderingEnabled;
    this.#footerExtra = footerExtra;
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
    });

    if (!resource?.message) {
      throw new Error("Message resource not fetched after initial PaginatedView reply");
    }

    return resource.message;
  }

  async #updateMessage(showButtons: boolean) {
    const items = await this.#paginator.current();
    const renderedItems = await Promise.all(
      items.map((item, idx) =>
        this.#renderItem(item, idx + this.#paginator.currentOffset + 1),
      ),
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
      await this.#handleButton(action.customId);
      await this.render(interaction);
    } catch {
      await this.#finalize();
    }
  }

  async #handleButton(customId: string) {
    switch (customId) {
      case "previous":
        await this.#paginator.previous();
        break;
      case "next":
        await this.#paginator.next();
        break;
      case "reorder":
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
