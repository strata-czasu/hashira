import type { Paginator } from "@hashira/paginate";
import type { Message, TextBasedChannel } from "discord.js";

interface TextChannelPaginatorOptions {
  channel: TextBasedChannel;
  pageSize: number;
}

export class TextChannelPaginator implements Paginator<Message> {
  readonly #channel: TextBasedChannel;
  readonly #pageSize: number;
  #page = 0;
  #items: Array<Message> = [];
  #lastPage: number | null = null;

  constructor({ channel, pageSize }: TextChannelPaginatorOptions) {
    this.#channel = channel;
    this.#pageSize = pageSize;
  }

  public get count(): number | null {
    if (!this.#lastPage) return null;
    return this.#items.length;
  }

  public get currentOffset(): number {
    return this.#page * this.#pageSize;
  }

  public get displayPages(): string {
    if (this.#lastPage === null) return "?";
    return (this.#lastPage + 1).toString();
  }

  public get displayCurrentPage(): string {
    return (this.#page + 1).toString();
  }

  public async current(): Promise<Message[]> {
    return await this.getPage();
  }

  private async getPage() {
    const end = this.currentOffset + this.#pageSize;
    // Fetch more messages if they aren't cached and we haven't reached the last page
    if (this.#lastPage === null && this.#items.length < end) {
      const messages = await this.fetchMessages();
      this.#items.push(...Array.from(messages.values()));
      // If we got less messages than the page size, we are on the last page
      if (messages.size < this.#pageSize) {
        this.#lastPage = this.#page;
      }
    }
    return this.#items.slice(this.currentOffset, end);
  }

  private async fetchMessages() {
    if (this.#items.length === 0) {
      return await this.#channel.messages.fetch({ limit: this.#pageSize });
    }

    const previousPage = this.#items.slice(
      this.currentOffset - this.#pageSize,
      this.currentOffset,
    );
    if (previousPage.length < this.#pageSize) {
      throw new Error("Previous page was not full, can't fetch more messages");
    }
    const lastMessage = previousPage.at(-1);
    if (!lastMessage) {
      throw new Error("Last message is missing");
    }
    return await this.#channel.messages.fetch({
      limit: this.#pageSize,
      before: lastMessage.id,
    });
  }

  public async reorder(): Promise<Message[]> {
    throw new Error("Ordering is not supported");
  }

  public get canPrevious() {
    return this.#page > 0;
  }

  public get canNext() {
    if (this.#lastPage === null) return true;
    return this.#page < this.#lastPage;
  }

  public async next(): Promise<Message[]> {
    if (!this.canNext) return [];
    this.#page++;
    return await this.current();
  }

  public async previous(): Promise<Message[]> {
    if (!this.canPrevious) return [];
    this.#page--;
    return await this.current();
  }
}
