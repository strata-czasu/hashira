import type { Client, EmbedBuilder, TextBasedChannel } from "discord.js";

// TODO)) Set correct channel ID
const LOG_CHANNEL_ID = "464484064842219531" as const;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type LogMessageData = { [key: string]: unknown };
type LogMessageType = { [key: string]: LogMessageData };
const initLogMessageTypes = {};

type HandlerProps = { client: Client; timestamp: Date };
type Handler<T> = (props: HandlerProps, data: T) => Promise<EmbedBuilder>;
type Message<T> = { type: T; data: LogMessageData; timestamp: Date };

export class Logger<
  const LogMessageTypes extends LogMessageType = typeof initLogMessageTypes,
> {
  #messageTypes: Map<string, Handler<unknown>> = new Map();
  #messages: Array<Message<keyof LogMessageTypes>> = [];
  #interval = 5_000 as const;
  #running = false;
  #batchSize = 5 as const;
  #logChannel: TextBasedChannel | null = null;

  /**
   * Register a new log message type and define how it will be formatted
   * @param type Unique log message name
   * @param handler Function to format a log message as string
   */
  addMessageType<T extends string, U extends LogMessageData>(
    type: T,
    handler: Handler<U>,
  ): Logger<Prettify<LogMessageTypes & Record<T, U>>> {
    this.#messageTypes.set(type, handler as Handler<unknown>);
    return this;
  }

  /**
   * Push a log message
   * @param type {string} Log message type
   * @param data {unknown} Data for the log message
   */
  async push<T extends keyof LogMessageTypes>(type: T, data: LogMessageTypes[T]) {
    if (typeof type !== "string") throw new Error("Type must be a string");
    this.#messages.push({ type, data, timestamp: new Date() });
  }

  private consumeLogMessageBatch() {
    const messages: Array<Message<keyof LogMessageTypes>> = [];
    for (let i = 0; i < this.#batchSize; i++) {
      const message = this.#messages.pop();
      if (!message) break;
      messages.push(message);
    }
    messages.reverse();
    return messages;
  }

  private async formatLogMessage<T>(
    client: Client,
    { type, data, timestamp }: Message<T>,
  ) {
    if (typeof type !== "string") throw new Error("Type must be a string");
    const handler = this.#messageTypes.get(type);
    if (!handler) throw new Error(`Handler not found for ${type}`);
    return await handler({ client, timestamp }, data);
  }

  private async getLogChannel(client: Client) {
    if (this.#logChannel) return this.#logChannel;
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (!channel) throw new Error(`Channel ${LOG_CHANNEL_ID} not found`);
    if (!channel.isTextBased())
      throw new Error(`Channel ${LOG_CHANNEL_ID} is not text based`);
    this.#logChannel = channel;
    return channel;
  }

  private async innerConsumeLoop(client: Client) {
    try {
      const messages = this.consumeLogMessageBatch();
      if (messages.length !== 0) {
        // TODO)) Add limiting by message length,
        // because our batch size could overflow a single message
        const formatted = await Promise.all(
          messages.map((m) => this.formatLogMessage(client, m)),
        );
        const channel = await this.getLogChannel(client);
        await channel.send({ embeds: formatted });
      }
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => this.innerConsumeLoop(client), this.#interval);
  }

  async consumeLoop(client: Client) {
    if (this.#running) throw new Error("logger is already running");
    this.#running = true;

    this.innerConsumeLoop(client);
  }
}
