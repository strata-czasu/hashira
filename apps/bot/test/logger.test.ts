import { describe, expect, it, mock } from "bun:test";
import { type Client, EmbedBuilder, type Guild, type TextBasedChannel } from "discord.js";

import { Logger, LogQueue } from "../src/logging/base/logger";

describe("Logger", () => {
  it(
    "keeps channels and queued messages in a shared queue but uses the latest formatters",
    async () => {
      const queue = new LogQueue();
      const guild = { id: "guild" } as Guild;
      const send = mock(async (_: { embeds: EmbedBuilder[] }) => {});
      const channel = { isSendable: () => true, send } as unknown as TextBasedChannel;
      const client = { guilds: { fetch: async () => guild } } as unknown as Client;

      const before = new Logger(queue).addMessageType("test", async () =>
        new EmbedBuilder().setTitle("before"),
      );
      before.updateGuild(guild, channel);
      before.start(client);

      // Simulates the logger module being re-evaluated by a hot reload
      const after = new Logger(queue).addMessageType("test", async () =>
        new EmbedBuilder().setTitle("after"),
      );

      expect(after.isRegistered(guild)).toBe(true);

      after.push("test", guild, {});
      await Bun.sleep(5500);

      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0]?.[0].embeds.map((embed) => embed.data.title)).toEqual(["after"]);
    },
    { timeout: 10_000 },
  );

  it("only accepts registered message types", () => {
    const queue = new LogQueue();
    const logger = new Logger(queue).addMessageType(
      "test",
      async (_, _data: { value: number }) => new EmbedBuilder(),
    );
    const guild = { id: "guild" } as Guild;

    // Type-level assertions only, never executed
    const _check = () => {
      logger.push("test", guild, { value: 1 });
      // @ts-expect-error unknown message type
      logger.push("unknown", guild, {});
      // @ts-expect-error wrong message data
      logger.push("test", guild, { value: "1" });
      // @ts-expect-error a fresh queue has no message types
      queue.push(guild, { type: "unknown", data: {}, timestamp: new Date() });
    };
    expect(_check).toBeFunction();
  });
});
