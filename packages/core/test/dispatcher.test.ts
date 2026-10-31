import { describe, expect, it, mock } from "bun:test";
import { Client, type Guild, type Message } from "discord.js";
import type { EventEmitter } from "node:events";

import { Hashira, persistent } from "../src";

const fakeGuild = { id: "guild" } as Guild;
const fakeGuildMessage = { inGuild: () => true } as unknown as Message;

// Emits through the plain EventEmitter signature, since these clients never log in
const emit = (client: Client, event: string, ...args: unknown[]) =>
  (client as EventEmitter).emit(event, ...args);

describe("Hashira.attach", () => {
  it("routes client events to handlers with a fresh context", async () => {
    const handler = mock(async (_ctx: { value: number }, _guild: Guild) => {});
    const bot = new Hashira({ name: "bot" }).const("value", 1).handle("guildCreate", handler);
    const client = bot.createClient();

    bot.attach(client);
    emit(client, "guildCreate", fakeGuild);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0].value).toBe(1);
    expect(handler.mock.calls[0]?.[1]).toBe(fakeGuild);
  });

  it("replaces handlers when attaching another instance", () => {
    const first = mock(async () => {});
    const second = mock(async () => {});
    const client = new Hashira({ name: "v1" }).handle("guildCreate", first).createClient();

    new Hashira({ name: "v1" }).handle("guildCreate", first).attach(client);
    new Hashira({ name: "v2" }).handle("guildCreate", second).attach(client);
    emit(client, "guildCreate", fakeGuild);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(client.listenerCount("guildCreate")).toBe(1);
    expect(client.listenerCount("interactionCreate")).toBe(1);
  });

  it("listens to events added by a later instance", () => {
    const handler = mock(async () => {});
    const client = new Hashira({ name: "v1" }).createClient();

    new Hashira({ name: "v1" }).attach(client);
    expect(client.listenerCount("messageCreate")).toBe(0);

    new Hashira({ name: "v2" }).handle("guildMessageCreate", handler).attach(client);
    emit(client, "messageCreate", fakeGuildMessage);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("stops calling handlers removed by a later instance", () => {
    const handler = mock(async () => {});
    const client = new Hashira({ name: "v1" }).createClient();

    new Hashira({ name: "v1" }).handle("guildCreate", handler).attach(client);
    new Hashira({ name: "v2" }).attach(client);
    emit(client, "guildCreate", fakeGuild);

    expect(handler).not.toHaveBeenCalled();
  });

  it("attaches to clients that were not created by Hashira", () => {
    const handler = mock(async () => {});
    const client = new Client({ intents: [] });

    new Hashira({ name: "bot" }).handle("guildCreate", handler).attach(client);
    emit(client, "guildCreate", fakeGuild);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("persistent", () => {
  it("creates the value once and reuses it", () => {
    const key = `test:${crypto.randomUUID()}`;
    const factory = mock(() => ({}));

    const first = persistent(key, factory);
    const second = persistent(key, factory);

    expect(second).toBe(first);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
