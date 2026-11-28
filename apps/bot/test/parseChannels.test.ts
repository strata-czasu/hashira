import { describe, expect, test } from "bun:test";
import { ChannelType, Collection, type Guild } from "discord.js";

import { expandCategoryChannelIds, parseChannelMentions } from "../src/util/parseChannels";

describe("parseChannelMentions", () => {
  test("should parse ID", () => {
    expect(parseChannelMentions("1225397219486728233")).toEqual(["1225397219486728233"]);
  });

  test("should parse multiple IDs", () => {
    expect(parseChannelMentions("1225397219486728233 1225397219486728234")).toEqual([
      "1225397219486728233",
      "1225397219486728234",
    ]);
  });

  test("should parse IDs with mentions", () => {
    expect(parseChannelMentions("<#1225397219486728233> <#1225397219486728234>")).toEqual([
      "1225397219486728233",
      "1225397219486728234",
    ]);
  });

  test("should parse mixed IDs and mentions", () => {
    expect(parseChannelMentions("1225397219486728233 <#1225397219486728234>")).toEqual([
      "1225397219486728233",
      "1225397219486728234",
    ]);
  });
});

describe("expandCategoryChannelIds", () => {
  const guild = {
    channels: {
      cache: new Collection([
        [
          "cat-1",
          {
            id: "cat-1",
            type: ChannelType.GuildCategory,
            children: {
              cache: new Collection([
                ["ch-1", { id: "ch-1" }],
                ["ch-2", { id: "ch-2" }],
              ]),
            },
          },
        ],
        [
          "cat-empty",
          {
            id: "cat-empty",
            type: ChannelType.GuildCategory,
            children: { cache: new Collection() },
          },
        ],
        ["ch-3", { id: "ch-3", type: ChannelType.GuildText }],
      ]),
    },
  } as unknown as Guild;

  test("expands categories into child channel IDs and deduplicates", () => {
    expect(expandCategoryChannelIds(guild, ["cat-1", "ch-2", "ch-3", "deleted"])).toEqual([
      "ch-1",
      "ch-2",
      "ch-3",
      "deleted",
    ]);
    expect(expandCategoryChannelIds(guild, ["cat-empty"])).toEqual([]);
  });

  test("optionally retains the category ID itself for removals", () => {
    expect(expandCategoryChannelIds(guild, ["cat-1"], { includeCategoryId: true })).toEqual([
      "cat-1",
      "ch-1",
      "ch-2",
    ]);
  });
});
