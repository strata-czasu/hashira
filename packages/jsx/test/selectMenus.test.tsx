/** @jsxImportSource @hashira/jsx */
import { describe, expect, it } from "bun:test";
import { ChannelType } from "discord.js";
import {
  ActionRow,
  ChannelSelect,
  MentionableSelect,
  RoleSelect,
  StringSelectMenu,
  StringSelectOption,
  UserSelect,
} from "../src";

describe("StringSelectMenu", () => {
  it("renders string select menu with options", () => {
    expect(
      <ActionRow>
        <StringSelectMenu customId="select-menu">
          <StringSelectOption label="Option 1" value="opt1" />
          <StringSelectOption label="Option 2" value="opt2" description="Description" />
        </StringSelectMenu>
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          StringSelectMenuBuilder {
            "data": {
              "custom_id": "select-menu",
              "type": 3,
            },
            "options": [
              StringSelectMenuOptionBuilder {
                "data": {
                  "emoji": undefined,
                  "label": "Option 1",
                  "value": "opt1",
                },
              },
              StringSelectMenuOptionBuilder {
                "data": {
                  "description": "Description",
                  "emoji": undefined,
                  "label": "Option 2",
                  "value": "opt2",
                },
              },
            ],
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });

  it("renders string select menu with placeholder and value constraints", () => {
    expect(
      <ActionRow>
        <StringSelectMenu
          customId="select-constrained"
          placeholder="Choose options..."
          minValues={1}
          maxValues={3}
        >
          <StringSelectOption label="A" value="a" />
          <StringSelectOption label="B" value="b" />
          <StringSelectOption label="C" value="c" />
        </StringSelectMenu>
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          StringSelectMenuBuilder {
            "data": {
              "custom_id": "select-constrained",
              "max_values": 3,
              "min_values": 1,
              "placeholder": "Choose options...",
              "type": 3,
            },
            "options": [
              StringSelectMenuOptionBuilder {
                "data": {
                  "emoji": undefined,
                  "label": "A",
                  "value": "a",
                },
              },
              StringSelectMenuOptionBuilder {
                "data": {
                  "emoji": undefined,
                  "label": "B",
                  "value": "b",
                },
              },
              StringSelectMenuOptionBuilder {
                "data": {
                  "emoji": undefined,
                  "label": "C",
                  "value": "c",
                },
              },
            ],
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });
});

describe("UserSelect", () => {
  it("renders user select menu", () => {
    expect(
      <ActionRow>
        <UserSelect customId="user-select" placeholder="Select a user" />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          UserSelectMenuBuilder {
            "data": {
              "custom_id": "user-select",
              "placeholder": "Select a user",
              "type": 5,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });

  it("renders user select with default users", () => {
    expect(
      <ActionRow>
        <UserSelect
          customId="user-select-defaults"
          defaultUsers={["123456789", "987654321"]}
        />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          UserSelectMenuBuilder {
            "data": {
              "custom_id": "user-select-defaults",
              "default_values": [
                {
                  "id": "123456789",
                  "type": "user",
                },
                {
                  "id": "987654321",
                  "type": "user",
                },
              ],
              "type": 5,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });
});

describe("RoleSelect", () => {
  it("renders role select menu", () => {
    expect(
      <ActionRow>
        <RoleSelect customId="role-select" placeholder="Select a role" />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          RoleSelectMenuBuilder {
            "data": {
              "custom_id": "role-select",
              "placeholder": "Select a role",
              "type": 6,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });

  it("renders role select with default roles", () => {
    expect(
      <ActionRow>
        <RoleSelect customId="role-select-defaults" defaultRoles={["111111111"]} />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          RoleSelectMenuBuilder {
            "data": {
              "custom_id": "role-select-defaults",
              "default_values": [
                {
                  "id": "111111111",
                  "type": "role",
                },
              ],
              "type": 6,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });
});

describe("MentionableSelect", () => {
  it("renders mentionable select menu", () => {
    expect(
      <ActionRow>
        <MentionableSelect
          customId="mentionable-select"
          placeholder="Select users or roles"
        />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          MentionableSelectMenuBuilder {
            "data": {
              "custom_id": "mentionable-select",
              "placeholder": "Select users or roles",
              "type": 7,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });

  it("renders mentionable select with default users and roles", () => {
    expect(
      <ActionRow>
        <MentionableSelect
          customId="mentionable-defaults"
          defaultUsers={["user123"]}
          defaultRoles={["role456"]}
        />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          MentionableSelectMenuBuilder {
            "data": {
              "custom_id": "mentionable-defaults",
              "default_values": [
                {
                  "id": "user123",
                  "type": "user",
                },
                {
                  "id": "role456",
                  "type": "role",
                },
              ],
              "type": 7,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });
});

describe("ChannelSelect", () => {
  it("renders channel select menu", () => {
    expect(
      <ActionRow>
        <ChannelSelect customId="channel-select" placeholder="Select a channel" />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          ChannelSelectMenuBuilder {
            "data": {
              "custom_id": "channel-select",
              "placeholder": "Select a channel",
              "type": 8,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });

  it("renders channel select with channel type filter", () => {
    expect(
      <ActionRow>
        <ChannelSelect
          customId="channel-select-filtered"
          channelTypes={[ChannelType.GuildText, ChannelType.GuildVoice]}
        />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          ChannelSelectMenuBuilder {
            "data": {
              "channel_types": [
                0,
                2,
              ],
              "custom_id": "channel-select-filtered",
              "type": 8,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });

  it("renders channel select with default channels", () => {
    expect(
      <ActionRow>
        <ChannelSelect
          customId="channel-select-defaults"
          defaultChannels={["channel123"]}
        />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          ChannelSelectMenuBuilder {
            "data": {
              "custom_id": "channel-select-defaults",
              "default_values": [
                {
                  "id": "channel123",
                  "type": "channel",
                },
              ],
              "type": 8,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });
});
