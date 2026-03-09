import { describe, expect, test } from "bun:test";
import { MessageReferenceType } from "discord.js";
import { getDmForwardMessageOptions } from "../src/dmForwarding";

describe("getDmForwardMessageOptions", () => {
  test("copies plain direct message content, embeds, and attachments", () => {
    const message = {
      author: { tag: "user#1234" },
      content: "hello",
      embeds: [{ description: "embed" }],
      attachments: [{ url: "https://example.com/file.png" }],
      reference: null,
    } as const;

    expect(getDmForwardMessageOptions(message as never)).toEqual({
      content: "**user#1234**: hello",
      embeds: [{ description: "embed" }],
      files: ["https://example.com/file.png"],
    });
  });

  test("uses native forwarding metadata for forwarded direct messages", () => {
    const message = {
      id: "message-id",
      channelId: "dm-channel-id",
      guildId: null,
      author: { tag: "user#1234" },
      content: "forwarded comment",
      embeds: [{ description: "embed" }],
      attachments: [{ url: "https://example.com/file.png" }],
      reference: {
        messageId: "source-message-id",
        channelId: "source-channel-id",
        guildId: undefined,
        type: MessageReferenceType.Forward,
      },
    } as const;

    expect(getDmForwardMessageOptions(message as never)).toEqual({
      content: "**user#1234**: forwarded comment",
      messageReference: {
        messageId: "message-id",
        channelId: "dm-channel-id",
        guildId: undefined,
        type: MessageReferenceType.Forward,
      },
    });
  });
});
