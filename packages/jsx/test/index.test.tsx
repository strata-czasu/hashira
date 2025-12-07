/** @jsx jsx */
/** @jsxFrag Fragment */
/** @jsxImportSource @hashira/jsx */
import { describe, expect, it } from "bun:test";
import { ButtonStyle, ChannelType, SeparatorSpacingSize } from "discord.js";
import {
  ActionRow,
  Button,
  ChannelSelect,
  Container,
  File,
  // biome-ignore lint/correctness/noUnusedImports: h and Fragment are required for JSX
  Fragment,
  jsx,
  MediaGallery,
  MediaGalleryItem,
  MentionableSelect,
  RoleSelect,
  render,
  Section,
  Separator,
  StringSelectMenu,
  StringSelectOption,
  TextDisplay,
  Thumbnail,
  UserSelect,
} from "../src";

describe("JSX", () => {
  it("renders text and components together", () => {
    const result = render(
      <>
        Text
        <ActionRow>
          <Button label="Click me" style={ButtonStyle.Primary} customId="click" />
        </ActionRow>
      </>,
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "components": [
          TextDisplayBuilder {
            "data": {
              "content": "Text",
              "type": 10,
            },
          },
          ActionRowBuilder {
            "components": [
              ButtonBuilder {
                "data": {
                  "custom_id": "click",
                  "emoji": undefined,
                  "label": "Click me",
                  "style": 1,
                  "type": 2,
                },
              },
            ],
            "data": {
              "type": 1,
            },
          },
        ],
        "files": [],
        "flags": 32768,
      }
    `);
  });

  it("renders nested fragments correctly", () => {
    const Part1 = () => <>Hello</>;
    const Part2 = () => <>World</>;
    const result = render(
      <>
        <Part1 /> <Part2 />
      </>,
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "components": [
          TextDisplayBuilder {
            "data": {
              "content": "Hello",
              "type": 10,
            },
          },
          TextDisplayBuilder {
            "data": {
              "content": " ",
              "type": 10,
            },
          },
          TextDisplayBuilder {
            "data": {
              "content": "World",
              "type": 10,
            },
          },
        ],
        "files": [],
        "flags": 32768,
      }
    `);
  });

  it("renders empty fragment as empty array", () => {
    // biome-ignore lint/complexity/noUselessFragments: we are testing fragments here
    expect(<></>).toMatchInlineSnapshot(`[]`);
  });

  it("renders simple text as string", () => {
    expect(<>Simple Text</>).toMatchInlineSnapshot(`
      [
        "Simple Text",
      ]
    `);
  });

  it("renders conditional rendering", () => {
    const isVisible = true;

    expect(
      <>
        {isVisible ? <TextDisplay content="Visible Text" /> : null}
        {!isVisible ? <TextDisplay content="Hidden Text" /> : null}
      </>,
    ).toMatchInlineSnapshot(`
      [
        TextDisplayBuilder {
          "data": {
            "content": "Visible Text",
            "type": 10,
          },
        },
      ]
    `);
  });

  describe("Button", () => {
    it("renders primary button with label", () => {
      expect(
        <Button label="Click me" style={ButtonStyle.Primary} customId="btn-primary" />,
      ).toMatchInlineSnapshot(`
        ButtonBuilder {
          "data": {
            "custom_id": "btn-primary",
            "emoji": undefined,
            "label": "Click me",
            "style": 1,
            "type": 2,
          },
        }
      `);
    });

    it("renders secondary button (default style)", () => {
      expect(
        <Button
          label="Secondary"
          customId="btn-secondary"
          style={ButtonStyle.Secondary}
        />,
      ).toMatchInlineSnapshot(`
        ButtonBuilder {
          "data": {
            "custom_id": "btn-secondary",
            "emoji": undefined,
            "label": "Secondary",
            "style": 2,
            "type": 2,
          },
        }
      `);
    });

    it("renders success button", () => {
      expect(
        <Button label="Success" style={ButtonStyle.Success} customId="btn-success" />,
      ).toMatchInlineSnapshot(`
        ButtonBuilder {
          "data": {
            "custom_id": "btn-success",
            "emoji": undefined,
            "label": "Success",
            "style": 3,
            "type": 2,
          },
        }
      `);
    });

    it("renders danger button", () => {
      expect(
        <Button label="Danger" style={ButtonStyle.Danger} customId="btn-danger" />,
      ).toMatchInlineSnapshot(`
        ButtonBuilder {
          "data": {
            "custom_id": "btn-danger",
            "emoji": undefined,
            "label": "Danger",
            "style": 4,
            "type": 2,
          },
        }
      `);
    });

    it("renders link button with URL", () => {
      expect(
        <Button label="Visit Site" url="https://example.com" />,
      ).toMatchInlineSnapshot(`
        ButtonBuilder {
          "data": {
            "emoji": undefined,
            "label": "Visit Site",
            "style": 5,
            "type": 2,
            "url": "https://example.com",
          },
        }
      `);
    });

    it("renders premium button with SKU ID", () => {
      expect(<Button skuId="sku_123456" />).toMatchInlineSnapshot(`
        ButtonBuilder {
          "data": {
            "emoji": undefined,
            "sku_id": "sku_123456",
            "style": 6,
            "type": 2,
          },
        }
      `);
    });

    it("renders disabled button", () => {
      expect(
        <Button
          label="Disabled"
          style={ButtonStyle.Primary}
          customId="btn-disabled"
          disabled
        />,
      ).toMatchInlineSnapshot(`
        ButtonBuilder {
          "data": {
            "custom_id": "btn-disabled",
            "disabled": true,
            "emoji": undefined,
            "label": "Disabled",
            "style": 1,
            "type": 2,
          },
        }
      `);
    });

    it("renders button with emoji", () => {
      expect(
        <Button
          label="With Emoji"
          style={ButtonStyle.Primary}
          customId="btn-emoji"
          emoji="👍"
        />,
      ).toMatchInlineSnapshot(`
        ButtonBuilder {
          "data": {
            "custom_id": "btn-emoji",
            "emoji": {
              "animated": false,
              "id": undefined,
              "name": "👍",
            },
            "label": "With Emoji",
            "style": 1,
            "type": 2,
          },
        }
      `);
    });
  });

  describe("ActionRow", () => {
    it("renders action row with multiple buttons", () => {
      expect(
        <ActionRow>
          <Button label="One" style={ButtonStyle.Primary} customId="btn-1" />
          <Button label="Two" style={ButtonStyle.Secondary} customId="btn-2" />
        </ActionRow>,
      ).toMatchInlineSnapshot(`
        ActionRowBuilder {
          "components": [
            ButtonBuilder {
              "data": {
                "custom_id": "btn-1",
                "emoji": undefined,
                "label": "One",
                "style": 1,
                "type": 2,
              },
            },
            ButtonBuilder {
              "data": {
                "custom_id": "btn-2",
                "emoji": undefined,
                "label": "Two",
                "style": 2,
                "type": 2,
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

  describe("StringSelectMenu", () => {
    it("renders string select menu with options", () => {
      expect(
        <ActionRow>
          <StringSelectMenu customId="select-menu">
            <StringSelectOption label="Option 1" value="opt1" />
            <StringSelectOption
              label="Option 2"
              value="opt2"
              description="Description"
            />
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

  describe("TextDisplay", () => {
    it("renders text display with content prop", () => {
      expect(<TextDisplay content="Hello, World!" />).toMatchInlineSnapshot(`
        TextDisplayBuilder {
          "data": {
            "content": "Hello, World!",
            "type": 10,
          },
        }
      `);
    });

    it("renders text display with markdown", () => {
      expect(
        <TextDisplay content="**Bold** and *italic* text with `code`" />,
      ).toMatchInlineSnapshot(`
        TextDisplayBuilder {
          "data": {
            "content": "**Bold** and *italic* text with \`code\`",
            "type": 10,
          },
        }
      `);
    });
  });

  describe("Thumbnail", () => {
    it("renders thumbnail with URL", () => {
      expect(<Thumbnail url="https://example.com/image.png" />).toMatchInlineSnapshot(`
        ThumbnailBuilder {
          "data": {
            "media": {
              "url": "https://example.com/image.png",
            },
            "type": 11,
          },
        }
      `);
    });

    it("renders thumbnail with description and spoiler", () => {
      expect(
        <Thumbnail
          url="https://example.com/secret.png"
          description="A secret image"
          spoiler
        />,
      ).toMatchInlineSnapshot(`
        ThumbnailBuilder {
          "data": {
            "description": "A secret image",
            "media": {
              "url": "https://example.com/secret.png",
            },
            "spoiler": true,
            "type": 11,
          },
        }
      `);
    });
  });

  describe("MediaGallery", () => {
    it("renders media gallery with single item", () => {
      expect(
        <MediaGallery>
          <MediaGalleryItem url="https://example.com/image.png" description="Image" />
        </MediaGallery>,
      ).toMatchInlineSnapshot(`
        MediaGalleryBuilder {
          "data": {
            "type": 12,
          },
          "items": [
            MediaGalleryItemBuilder {
              "data": {
                "description": "Image",
                "media": {
                  "url": "https://example.com/image.png",
                },
              },
            },
          ],
        }
      `);
    });

    it("renders media gallery with multiple items", () => {
      expect(
        <MediaGallery>
          <MediaGalleryItem url="https://example.com/1.png" />
          <MediaGalleryItem url="https://example.com/2.png" />
          <MediaGalleryItem url="https://example.com/3.png" spoiler />
        </MediaGallery>,
      ).toMatchInlineSnapshot(`
        MediaGalleryBuilder {
          "data": {
            "type": 12,
          },
          "items": [
            MediaGalleryItemBuilder {
              "data": {
                "media": {
                  "url": "https://example.com/1.png",
                },
              },
            },
            MediaGalleryItemBuilder {
              "data": {
                "media": {
                  "url": "https://example.com/2.png",
                },
              },
            },
            MediaGalleryItemBuilder {
              "data": {
                "media": {
                  "url": "https://example.com/3.png",
                },
                "spoiler": true,
              },
            },
          ],
        }
      `);
    });
  });

  describe("File", () => {
    it("renders file component", () => {
      expect(<File url="attachment://document.pdf" />).toMatchInlineSnapshot(`
        FileBuilder {
          "data": {
            "file": {
              "url": "attachment://document.pdf",
            },
            "type": 13,
          },
        }
      `);
    });

    it("renders file component with spoiler", () => {
      expect(<File url="attachment://secret.txt" spoiler />).toMatchInlineSnapshot(`
        FileBuilder {
          "data": {
            "file": {
              "url": "attachment://secret.txt",
            },
            "spoiler": true,
            "type": 13,
          },
        }
      `);
    });
  });

  describe("Separator", () => {
    it("renders separator with default settings", () => {
      expect(<Separator />).toMatchInlineSnapshot(`
        SeparatorBuilder {
          "data": {
            "type": 14,
          },
        }
      `);
    });

    it("renders separator with divider line", () => {
      expect(<Separator divider />).toMatchInlineSnapshot(`
        SeparatorBuilder {
          "data": {
            "divider": true,
            "type": 14,
          },
        }
      `);
    });

    it("renders separator with large spacing", () => {
      expect(
        <Separator spacing={SeparatorSpacingSize.Large} divider />,
      ).toMatchInlineSnapshot(`
        SeparatorBuilder {
          "data": {
            "divider": true,
            "spacing": 2,
            "type": 14,
          },
        }
      `);
    });
  });

  describe("Section", () => {
    it("renders section with button accessory", () => {
      expect(
        <Section
          accessory={
            <Button label="Action" style={ButtonStyle.Primary} customId="section-btn" />
          }
        >
          <TextDisplay content="Section content with a button" />
        </Section>,
      ).toMatchInlineSnapshot(`
        SectionBuilder {
          "accessory": ButtonBuilder {
            "data": {
              "custom_id": "section-btn",
              "emoji": undefined,
              "label": "Action",
              "style": 1,
              "type": 2,
            },
          },
          "components": [
            TextDisplayBuilder {
              "data": {
                "content": "Section content with a button",
                "type": 10,
              },
            },
          ],
          "data": {
            "type": 9,
          },
        }
      `);
    });

    it("renders section with thumbnail accessory", () => {
      expect(
        <Section accessory={<Thumbnail url="https://example.com/thumb.png" />}>
          <TextDisplay content="Content with thumbnail" />
        </Section>,
      ).toMatchInlineSnapshot(`
        SectionBuilder {
          "accessory": ThumbnailBuilder {
            "data": {
              "media": {
                "url": "https://example.com/thumb.png",
              },
              "type": 11,
            },
          },
          "components": [
            TextDisplayBuilder {
              "data": {
                "content": "Content with thumbnail",
                "type": 10,
              },
            },
          ],
          "data": {
            "type": 9,
          },
        }
      `);
    });
  });

  describe("Container", () => {
    it("renders container with text display", () => {
      expect(
        <Container>
          <TextDisplay content="Inside container" />
        </Container>,
      ).toMatchInlineSnapshot(`
        ContainerBuilder {
          "components": [
            TextDisplayBuilder {
              "data": {
                "content": "Inside container",
                "type": 10,
              },
            },
          ],
          "data": {
            "type": 17,
          },
        }
      `);
    });

    it("renders container with accent color", () => {
      expect(
        <Container accentColor={0xff5733}>
          <TextDisplay content="Colored container" />
        </Container>,
      ).toMatchInlineSnapshot(`
        ContainerBuilder {
          "components": [
            TextDisplayBuilder {
              "data": {
                "content": "Colored container",
                "type": 10,
              },
            },
          ],
          "data": {
            "accent_color": 16734003,
            "type": 17,
          },
        }
      `);
    });

    it("renders container with spoiler", () => {
      expect(
        <Container spoiler>
          <TextDisplay content="Hidden content" />
        </Container>,
      ).toMatchInlineSnapshot(`
        ContainerBuilder {
          "components": [
            TextDisplayBuilder {
              "data": {
                "content": "Hidden content",
                "type": 10,
              },
            },
          ],
          "data": {
            "spoiler": true,
            "type": 17,
          },
        }
      `);
    });

    it("renders container with multiple component types", () => {
      expect(
        <Container accentColor={0x5865f2}>
          <TextDisplay content="Welcome!" />
          <Separator divider />
          <MediaGallery>
            <MediaGalleryItem url="https://example.com/banner.png" />
          </MediaGallery>
        </Container>,
      ).toMatchInlineSnapshot(`
        ContainerBuilder {
          "components": [
            TextDisplayBuilder {
              "data": {
                "content": "Welcome!",
                "type": 10,
              },
            },
            SeparatorBuilder {
              "data": {
                "divider": true,
                "type": 14,
              },
            },
            MediaGalleryBuilder {
              "data": {
                "type": 12,
              },
              "items": [
                MediaGalleryItemBuilder {
                  "data": {
                    "media": {
                      "url": "https://example.com/banner.png",
                    },
                  },
                },
              ],
            },
          ],
          "data": {
            "accent_color": 5793266,
            "type": 17,
          },
        }
      `);
    });
  });
});
