import { describe, expect, test } from "bun:test";
import { parseChannelMentions } from "../src/util/parseChannels";

describe("parseChannelMentions", () => {
  test("should parse ID", () => {
    expect(parseChannelMentions("1225397219486728233")).toEqual([
      "1225397219486728233",
    ]);
  });

  test("should parse multiple IDs", () => {
    expect(parseChannelMentions("1225397219486728233 1225397219486728234")).toEqual([
      "1225397219486728233",
      "1225397219486728234",
    ]);
  });

  test("should parse IDs with mentions", () => {
    expect(
      parseChannelMentions("<#1225397219486728233> <#1225397219486728234>"),
    ).toEqual(["1225397219486728233", "1225397219486728234"]);
  });

  test("should parse mixed IDs and mentions", () => {
    expect(parseChannelMentions("1225397219486728233 <#1225397219486728234>")).toEqual([
      "1225397219486728233",
      "1225397219486728234",
    ]);
  });
});
