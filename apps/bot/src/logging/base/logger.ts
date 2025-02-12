import type { Prettify } from "@hashira/core";
import type { Client, EmbedBuilder, Guild, TextBasedChannel } from "discord.js";
import { Batcher, InMemoryBackend } from "../../util/batcher";

type LogMessageData = Record<string, unknown>;
export type LogMessageType = Record<string, LogMessageData>;
const initLogMessageTypes = {};

type HandlerProps = { client: Client; timestamp: Date };
type Handler<T> = (props: HandlerProps, data: T) => Promise<EmbedBuilder>;
type Message<T> = { type: T; data: LogMessageData; timestamp: Date };

export class Logger<
  const LogMessageTypes extends LogMessageType = typeof initLogMessageTypes,
> {
  #messageTypes: Map<string, Handler<unknown>> = new Map();
  #batcher: Batcher<string, Message<keyof LogMessageTypes>>;
  #logChannels: Map<string, TextBasedChannel> = new Map();
  #client: Client | null = null;

  constructor() {
    this.#batcher = new Batcher(this.processBatch.bind(this), {
      interval: { seconds: 5 },
      batchSize: 5,
      backend: new InMemoryBackend(),
    });
  }

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
    return this as unknown as Logger<Prettify<LogMessageTypes & Record<T, U>>>;
  }

  isRegistered(guild: Guild) {
    return this.#logChannels.has(guild.id);
  }

  updateGuild(guild: Guild, logChannel: TextBasedChannel) {
    this.#logChannels.set(guild.id, logChannel);
  }

  /**
   * Push a log message
   * @param type {string} Log message type
   * @param guild {Guild} Guild where the log message originated
   * @param data {unknown} Data for the log message
   */
  push<T extends keyof LogMessageTypes>(
    type: T,
    guild: Guild,
    data: LogMessageTypes[T],
  ) {
    if (typeof type !== "string") throw new Error("Type must be a string");
    this.#batcher.push(guild.id, { type, data, timestamp: new Date() });
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

  private async getLogChannel(guild: Guild) {
    const logChannel = this.#logChannels.get(guild.id);
    if (!logChannel?.isSendable()) {
      throw new Error(`Log channel for guild ${guild.id} not initialized`);
    }
    return logChannel;
  }

  private async processBatch(
    guildId: string,
    messages: Array<Message<keyof LogMessageTypes>>,
  ) {
    const client = this.#client;
    if (!client) throw new Error("Client not initialized");
    const guild = await client.guilds.fetch(guildId);

    const channel = await this.getLogChannel(guild);
    const formatted = await Promise.all(
      messages.map((m) => this.formatLogMessage(client, m)),
    );

    await channel.send({ embeds: formatted });
  }

  public start(client: Client) {
    this.#client = client;
    this.#batcher.start();
  }
}
