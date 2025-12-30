/** @jsxImportSource @hashira/jsx */
import { describe, expect, it } from "bun:test";
import { ButtonStyle, SeparatorSpacingSize } from "discord.js";
import {
  Button,
  Container,
  MediaGallery,
  MediaGalleryItem,
  Section,
  Separator,
  TextDisplay,
  Thumbnail,
} from "../src";

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
