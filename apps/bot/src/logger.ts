import type { Prettify } from "@hashira/core";
import type { Client, EmbedBuilder, Guild, TextBasedChannel } from "discord.js";

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
  #messages: Map<string, Array<Message<keyof LogMessageTypes>>> = new Map();
  #interval = 5_000 as const;
  #running: Map<string, boolean> = new Map();
  #batchSize = 5 as const;
  #logChannels: Map<string, TextBasedChannel> = new Map();
  // All registered guilds
  #guilds: Set<Guild> = new Set();

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

  addGuild(guild: Guild, logChannel: TextBasedChannel) {
    this.#guilds.add(guild);
    this.#messages.set(guild.id, []);
    this.#logChannels.set(guild.id, logChannel);
  }

  isRegistered(guild: Guild) {
    return this.#guilds.has(guild);
  }

  /**
   * Push a log message
   * @param type {string} Log message type
   * @param guild {Guild} Guild where the log message originated
   * @param data {unknown} Data for the log message
   */
  async push<T extends keyof LogMessageTypes>(
    type: T,
    guild: Guild,
    data: LogMessageTypes[T],
  ) {
    if (typeof type !== "string") throw new Error("Type must be a string");
    const messages = this.#messages.get(guild.id);
    if (!messages) throw new Error(`Logger for guild ${guild.id} not initialized`);
    messages.push({ type, data, timestamp: new Date() });
  }

  private consumeLogMessageBatch(guild: Guild) {
    const messages: Array<Message<keyof LogMessageTypes>> = [];
    for (let i = 0; i < this.#batchSize; i++) {
      const guildMessages = this.#messages.get(guild.id);
      if (!guildMessages)
        throw new Error(`Logger for guild ${guild.id} not initialized`);
      const message = guildMessages.pop();
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

  private async getLogChannel(guild: Guild) {
    const logChannel = this.#logChannels.get(guild.id);
    if (!logChannel)
      throw new Error(`Log channel for guild ${guild.id} not initialized`);
    return logChannel;
  }

  private async innerConsumeLoop(client: Client, guild: Guild) {
    try {
      const messages = this.consumeLogMessageBatch(guild);
      if (messages.length !== 0) {
        // TODO)) Add limiting by message length,
        // because our batch size could overflow a single message
        const formatted = await Promise.all(
          messages.map((m) => this.formatLogMessage(client, m)),
        );
        const channel = await this.getLogChannel(guild);
        await channel.send({ embeds: formatted });
      }
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => this.innerConsumeLoop(client, guild), this.#interval);
  }

  private consumeLoop(client: Client, guild: Guild) {
    const running = this.#running.get(guild.id);
    if (running) throw new Error(`logger is already running for guild ${guild.id}`);
    this.#running.set(guild.id, true);

    this.innerConsumeLoop(client, guild);
  }

  startConsumeLoops(client: Client) {
    for (const guild of this.#guilds) {
      this.consumeLoop(client, guild);
    }
  }
}
