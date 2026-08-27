import { describe, expect, test } from "bun:test";
import { GatewayIntentBits } from "discord.js";

import { filterDisabledIntents } from "../src/intents/util";

describe("filterDisabledIntents", () => {
  test("removes temporarily disabled privileged intents", () => {
    const intents = filterDisabledIntents(
      [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      [GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent],
    );

    expect(intents).toEqual([GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]);
  });

  test("keeps intents when none are disabled", () => {
    const intents = [GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent];

    expect(filterDisabledIntents(intents, [])).toEqual(intents);
  });
});
