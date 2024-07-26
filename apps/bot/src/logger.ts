import type { Client } from "discord.js";

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type LogMessageData = { [key: string]: unknown };
type LogMessageType = { [key: string]: LogMessageData };
const initLogMessageTypes = {};

type Handler<T> = (client: Client, data: T) => Promise<string>;

export class Logger<
  const LogMessageTypes extends LogMessageType = typeof initLogMessageTypes,
> {
  #messageTypes: Map<string, Handler<unknown>> = new Map();
  #messages: Array<{ type: keyof LogMessageTypes; data: LogMessageData }> = [];
  #interval = 5000;
  #running = false;

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

    console.log(`push ${type} with ${data}`);
    this.#messages.push({ type, data });
  }

  private async innerConsumeLoop(client: Client) {
    try {
      console.log("Consuming log messages...");
    } catch (e) {
      console.error(e);
    }
    // TODO)) Consume up to 5 logs
    // TODO)) Combine them into a single message
    // TODO)) Send to log channel

    setTimeout(() => this.innerConsumeLoop(client), this.#interval);
  }

  async consumeLoop(client: Client) {
    if (this.#running) throw new Error("logger is already running");
    this.#running = true;

    this.innerConsumeLoop(client);
  }
}
