/** @jsxImportSource @hashira/jsx */
import { describe, expect, it } from "bun:test";
import { ButtonStyle, SeparatorSpacingSize } from "discord.js";

import {
  ActionRow,
  Bold,
  Button,
  Container,
  H1,
  type JSXNode,
  MediaGallery,
  MediaGalleryItem,
  Section,
  Separator,
  StringSelectMenu,
  StringSelectOption,
  TextDisplay,
  Thumbnail,
} from "../src";
import { renderComponents, renderPage } from "../src/preview/html";
import { PREVIEW_CSS } from "../src/preview/theme";
import { viewToComponents } from "../src/preview/views";

const sample: JSXNode = (
  <>
    <Container accentColor={0x5865f2}>
      <TextDisplay>
        <H1>
          Team <Bold>ranking</Bold>
        </H1>
      </TextDisplay>
      <Separator divider spacing={SeparatorSpacingSize.Large} />
      <Section
        accessory={<Thumbnail url="https://cdn.example.com/avatar.png" description="avatar" />}
      >
        <TextDisplay content="**kasia** — 120 pkt" />
      </Section>
      <ActionRow>
        <Button style={ButtonStyle.Primary} customId="vote">
          Vote
        </Button>
        <Button style={ButtonStyle.Link} url="https://example.com">
          Rules
        </Button>
      </ActionRow>
      <ActionRow>
        <StringSelectMenu customId="pick" placeholder="Choose a team">
          <StringSelectOption label="Red" value="red" default />
          <StringSelectOption label="Blue" value="blue" />
        </StringSelectMenu>
      </ActionRow>
    </Container>
    <MediaGallery>
      <MediaGalleryItem url="https://cdn.example.com/chart.png" />
    </MediaGallery>
    <TextDisplay content={"Plain trailing text with a mention: <@123>"} />
  </>
);

describe("preview html renderer", () => {
  it("renders containers, buttons and selects to markup", () => {
    const body = renderComponents(viewToComponents(sample));
    expect(body).toMatchSnapshot();
  });

  it("produces a complete document shell", () => {
    const components = viewToComponents(<TextDisplay content="hi" />);
    expect(renderPage(components)).toBe(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>preview</title>
<style>${PREVIEW_CSS}</style>
</head>
<body>
<div class="d-page">${renderComponents(components)}</div>
</body>
</html>`);
  });

  it("resolves attachment:// urls from the attachments map", () => {
    const body = renderComponents(
      viewToComponents(
        <MediaGallery>
          <MediaGalleryItem url="attachment://chart.png" />
        </MediaGallery>,
      ),
      { attachments: { "chart.png": "data:image/png;base64,AAA" } },
    );
    expect(body).toMatchInlineSnapshot(
      `"<div class="d-components"><div class="d-gallery" style="grid-template-columns:repeat(1, minmax(0, 1fr))"><div class="d-gallery-item" style="height:200px"><img src="data:image/png;base64,AAA" alt=""></div></div></div>"`,
    );
  });
});
