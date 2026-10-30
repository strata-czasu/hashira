import { describe, expect, it } from "bun:test";
import { DiscordAPIError } from "discord.js";

import { isDiscordAPIError, isDiscordjsError } from "../src/util/discordErrors";

// Simulates classes from a discord.js module evaluated before a hot reload
const DetachedDiscordAPIError = class DiscordAPIError extends Error {};
const DetachedDiscordjsError = class DiscordjsError extends Error {};

describe("discord error guards", () => {
  it("matches errors from the current discord.js module", () => {
    const apiError = new DiscordAPIError(
      { code: 10007, message: "Unknown Member" },
      10007,
      404,
      "GET",
      "/",
      {},
    );
    expect(isDiscordAPIError(apiError)).toBe(true);
    expect(isDiscordjsError(apiError)).toBe(false);
  });

  it("matches errors from a previously evaluated discord.js module", () => {
    expect(isDiscordAPIError(new DetachedDiscordAPIError())).toBe(true);
    expect(isDiscordjsError(new DetachedDiscordjsError())).toBe(true);
  });

  it("rejects unrelated errors", () => {
    expect(isDiscordAPIError(new Error("nope"))).toBe(false);
    expect(isDiscordjsError(new TypeError("nope"))).toBe(false);
    expect(isDiscordAPIError({ constructor: { name: "DiscordAPIError" } })).toBe(false);
  });
});
