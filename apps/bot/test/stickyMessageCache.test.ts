import { describe, expect, mock, test } from "bun:test";
import type { ExtendedPrismaClient, StickyMessage } from "@hashira/db";
import { StickyMessageCache } from "../src/stickyMessage/stickyMessageCache";

describe("StickyMessageCache", () => {
  test("caches positive results", async () => {
    const cache = new StickyMessageCache();

    const mockStickyMessage: StickyMessage = {
      id: 1,
      guildId: "guild1",
      channelId: "channel1",
      lastMessageId: "message1",
      content: { test: "data" },
      enabled: true,
    };

    const findFirstMock = mock(() => Promise.resolve(mockStickyMessage));
    const mockPrisma = {
      stickyMessage: {
        findFirst: findFirstMock,
      },
    } as unknown as ExtendedPrismaClient;

    cache.start(mockPrisma);

    // First call should query the database
    const result1 = await cache.get("channel1");
    expect(result1).toEqual(mockStickyMessage);
    expect(findFirstMock).toHaveBeenCalledTimes(1);

    // Second call should use cache and not query the database
    const result2 = await cache.get("channel1");
    expect(result2).toEqual(mockStickyMessage);
    expect(findFirstMock).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  test("caches negative results (channels without sticky messages)", async () => {
    const cache = new StickyMessageCache();

    const findFirstMock = mock(() => Promise.resolve(null));
    const mockPrisma = {
      stickyMessage: {
        findFirst: findFirstMock,
      },
    } as unknown as ExtendedPrismaClient;

    cache.start(mockPrisma);

    // First call should query the database and get null
    const result1 = await cache.get("channel1");
    expect(result1).toBeNull();
    expect(findFirstMock).toHaveBeenCalledTimes(1);

    // Second call should use cache and not query the database
    const result2 = await cache.get("channel1");
    expect(result2).toBeNull();
    expect(findFirstMock).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  test("invalidate removes entry from cache", async () => {
    const cache = new StickyMessageCache();

    const mockStickyMessage: StickyMessage = {
      id: 1,
      guildId: "guild1",
      channelId: "channel1",
      lastMessageId: "message1",
      content: { test: "data" },
      enabled: true,
    };

    const findFirstMock = mock(() => Promise.resolve(mockStickyMessage));
    const mockPrisma = {
      stickyMessage: {
        findFirst: findFirstMock,
      },
    } as unknown as ExtendedPrismaClient;

    cache.start(mockPrisma);

    // First call caches the result
    await cache.get("channel1");
    expect(findFirstMock).toHaveBeenCalledTimes(1);

    // Invalidate the cache
    cache.invalidate("channel1");

    // Next call should query the database again
    await cache.get("channel1");
    expect(findFirstMock).toHaveBeenCalledTimes(2);
  });

  test("isCached returns true for cached channels", async () => {
    const cache = new StickyMessageCache();

    const findFirstMock = mock(() => Promise.resolve(null));
    const mockPrisma = {
      stickyMessage: {
        findFirst: findFirstMock,
      },
    } as unknown as ExtendedPrismaClient;

    cache.start(mockPrisma);

    expect(cache.isCached("channel1")).toBe(false);

    await cache.get("channel1");

    expect(cache.isCached("channel1")).toBe(true);
  });

  test("update sets cache entry", async () => {
    const cache = new StickyMessageCache();

    const mockStickyMessage: StickyMessage = {
      id: 1,
      guildId: "guild1",
      channelId: "channel1",
      lastMessageId: "message2",
      content: { test: "data" },
      enabled: true,
    };

    const updateMock = mock(() => Promise.resolve(mockStickyMessage));
    const findFirstMock = mock();
    const mockPrisma = {
      stickyMessage: {
        update: updateMock,
        findFirst: findFirstMock,
      },
    } as unknown as ExtendedPrismaClient;

    cache.start(mockPrisma);

    // Update should set the cache
    await cache.update("channel1", "message2");

    // Next get should use cache, not query database
    const result = await cache.get("channel1");
    expect(result).toEqual(mockStickyMessage);
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});
