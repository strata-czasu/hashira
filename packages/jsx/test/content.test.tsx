/** @jsxImportSource @hashira/jsx */
import { describe, expect, it } from "bun:test";
import { TimestampStyles } from "discord.js";
import {
  Bold,
  Br,
  CodeBlock,
  File,
  InlineCode,
  Italic,
  MediaGallery,
  MediaGalleryItem,
  Strikethrough,
  TextDisplay,
  Thumbnail,
  TimeStamp,
} from "../src";

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

  it("renders text display with children as content", () => {
    expect(
      <TextDisplay>This is some text inside the TextDisplay component.</TextDisplay>,
    ).toMatchInlineSnapshot(`
      TextDisplayBuilder {
        "data": {
          "content": "This is some text inside the TextDisplay component.",
          "type": 10,
        },
      }
    `);
  });

  it("renders text display with children using Markdown components", () => {
    expect(
      <TextDisplay>
        <Bold>Bold Text</Bold> <Br />
        <Italic>
          Italic <Strikethrough>Strike</Strikethrough> Text
        </Italic>{" "}
        <Br />
        <CodeBlock language="js">console.log("Hello, World!");</CodeBlock>
        <TimeStamp timestamp={new Date(0)} format={TimestampStyles.LongDate} /> <Br />
        <InlineCode>Inline Code</InlineCode>
      </TextDisplay>,
    ).toMatchInlineSnapshot(`
      TextDisplayBuilder {
        "data": {
          "content": 
      "**Bold Text** 
      _Italic ~~Strike~~ Text_ 
      \`\`\`js
      console.log("Hello, World!");
      \`\`\`
      <t:0:D> 
      \`Inline Code\`"
      ,
          "type": 10,
        },
      }
    `);
  });

  it("renders text display throws if both content and children are provided", () => {
    expect(() => (
      <TextDisplay content="Content prop">Child content</TextDisplay>
    )).toThrowError("TextDisplay cannot have both `content` prop and children");
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
