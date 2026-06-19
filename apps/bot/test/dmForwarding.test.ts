import { describe, expect, test } from "bun:test";
import { MessageReferenceType } from "discord.js";
import {
  type DmForwardMessage,
  getDmForwardMessageOptions,
} from "../src/dmForwarding";

const createMockAttachments = (
  ...urls: string[]
): DmForwardMessage["attachments"] => ({
  map: (callback) => urls.map((url) => callback({ url })),
});

describe("getDmForwardMessageOptions", () => {
  test("copies plain direct message content, embeds, and attachments", () => {
    const message = {
      id: "message-id",
      channelId: "dm-channel-id",
      guildId: null,
      author: { tag: "user#1234" },
      content: "hello",
      embeds: [{ description: "embed" }] as DmForwardMessage["embeds"],
      attachments: createMockAttachments("https://example.com/file.png"),
      reference: null,
    } satisfies DmForwardMessage;

    expect(getDmForwardMessageOptions(message)).toEqual({
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
      embeds: [{ description: "embed" }] as DmForwardMessage["embeds"],
      attachments: createMockAttachments("https://example.com/file.png"),
      reference: {
        messageId: "source-message-id",
        channelId: "source-channel-id",
        guildId: undefined,
        type: MessageReferenceType.Forward,
      },
    } satisfies DmForwardMessage;

    expect(getDmForwardMessageOptions(message)).toEqual({
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
