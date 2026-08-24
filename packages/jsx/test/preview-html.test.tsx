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
import { viewToApiComponents } from "../src/preview/compare";
import { renderComponentsToBody, renderComponentsToHtml } from "../src/preview/html";

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
    const body = renderComponentsToBody(viewToApiComponents(sample));
    expect(body).toMatchSnapshot();
  });

  it("produces a complete document shell", () => {
    const doc = renderComponentsToHtml(viewToApiComponents(<TextDisplay content="hi" />), {
      theme: "dark",
      width: 480,
    });
    expect(doc).toContain('<body data-d-theme="dark">');
    expect(doc).toContain('style="width:480px"');
    expect(doc).toContain("<style>");
  });

  it("resolves attachment:// urls from the attachments map", () => {
    const body = renderComponentsToBody(
      viewToApiComponents(
        <MediaGallery>
          <MediaGalleryItem url="attachment://chart.png" />
        </MediaGallery>,
      ),
      { attachments: { "chart.png": "data:image/png;base64,AAA" } },
    );
    expect(body).toContain('src="data:image/png;base64,AAA"');
  });
});
