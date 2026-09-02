import { describe, expect, it } from "bun:test";
import {
  type APIMessageTopLevelComponent,
  AttachmentBuilder,
  ButtonStyle,
  ComponentType,
  SeparatorSpacingSize,
} from "discord.js";
/** @jsxImportSource @hashira/jsx */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

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
import { viewToComponents, viewToHtml } from "../src/preview/views";

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

  it("names file cards from the attachment url, not the resolved data uri", () => {
    const file: APIMessageTopLevelComponent = {
      type: ComponentType.File,
      file: { url: "attachment://report.txt" },
    };
    expect(
      renderComponents([file], { attachments: { "report.txt": "data:text/plain;base64,AAA" } }),
    ).toMatchInlineSnapshot(
      `"<div class="d-components"><div class="d-file-card"><svg class="d-file-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9z"/></svg><span class="d-file-name">report.txt</span></div></div>"`,
    );
  });

  it("labels only premium buttons as SKU", () => {
    const row = (button: object): APIMessageTopLevelComponent =>
      ({ type: ComponentType.ActionRow, components: [button] }) as never;
    const premium = { type: ComponentType.Button, style: ButtonStyle.Premium, sku_id: "1" };
    const broken = { type: ComponentType.Button, style: ButtonStyle.Primary, custom_id: "x" };
    expect(renderComponents([row(premium)])).toMatchInlineSnapshot(
      `"<div class="d-components"><div class="d-row"><span class="d-btn d-btn-premium">SKU</span></div></div>"`,
    );
    expect(renderComponents([row(broken)])).toMatchInlineSnapshot(
      `"<div class="d-components"><div class="d-row"><span class="d-btn d-btn-primary"></span></div></div>"`,
    );
  });

  it("resolves file-path attachments to data uris", () => {
    const path = join(tmpdir(), "hashira-jsx-fixture.txt");
    writeFileSync(path, "hi");
    const html = viewToHtml(
      <>
        <MediaGallery>
          <MediaGalleryItem url="attachment://f.txt" />
        </MediaGallery>
        {new AttachmentBuilder(path, { name: "f.txt" })}
      </>,
    );
    expect(/<img src="([^"]+)"/.exec(html)?.[1]).toBe("data:text/plain;charset=utf-8;base64,aGk=");
  });

  it("throws on stream attachments instead of silently skipping them", () => {
    const view = (
      <>
        <TextDisplay content="x" />
        {new AttachmentBuilder(Readable.from(["x"]), { name: "s.txt" })}
      </>
    );
    expect(() => viewToHtml(view)).toThrow('Attachment "s.txt"');
  });
});
