import { describe, expect, it } from "bun:test";

import { renderMarkdown } from "../src/preview/markdown";

const FIXED_NOW = new Date("2026-08-24T12:00:00Z");

const render = (source: string) => renderMarkdown(source, { now: FIXED_NOW, locale: "en-US" });

describe("renderMarkdown", () => {
  it("escapes raw html", () => {
    expect(render("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
    expect(render("<script>\nalert(1)\n</script>")).toBe(
      "<p>&lt;script&gt;<br>alert(1)<br>&lt;/script&gt;</p>",
    );
  });

  it("renders headings and subtext", () => {
    const html = render("# Title\n## Sub\n### Minor\n-# footnote");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<h2>Sub</h2>");
    expect(html).toContain("<h3>Minor</h3>");
    expect(html).toContain('<div class="d-subtext">footnote</div>');
  });

  it("renders emphasis", () => {
    const html = render("**bold** *em* __under__ ~~strike~~ ***both***");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>em</em>");
    expect(html).toContain("<u>under</u>");
    expect(html).toContain("<s>strike</s>");
    expect(html).toContain("<em><strong>both</strong></em>");
  });

  it("does not transform markdown inside code", () => {
    const html = render("`**bold** ||spoiler|| <@123>`\n\n```js\n__block__ <t:0:F>\n```");
    expect(html).toContain('<code class="d-code-inline">**bold** ||spoiler|| &lt;@123&gt;</code>');
    expect(html).toContain("__block__ &lt;t:0:F&gt;");
    expect(html).not.toContain("<u>block</u>");
    expect(html).not.toContain("d-timestamp");
  });

  it("renders spoilers", () => {
    expect(render("||**secret**||")).toContain(
      '<span class="d-spoiler"><strong>secret</strong></span>',
    );
  });

  it("groups quotes and lists", () => {
    const html = render("> line one\n> line two\n- a\n- b\n1. one\n2. two");
    expect(html).toContain("<blockquote><p>line one<br>line two</p></blockquote>");
    expect(html).toContain("<ul><li>a</li><li>b</li></ul>");
    expect(html).toContain("<ol><li>one</li><li>two</li></ol>");
  });

  it("joins consecutive lines in a paragraph with <br>", () => {
    expect(render("a\nb")).toBe("<p>a<br>b</p>");
  });

  it("renders masked links and blocks unsafe urls", () => {
    expect(render("[click](https://example.com)")).toContain('<a href="https://example.com"');
    expect(render("[x](javascript:alert(1))")).toBe("<p>x</p>");
  });

  it("renders mentions as pills with fallback labels", () => {
    const html = render("hi <@123> <#456> <@&789>");
    expect(html).toContain('data-kind="user" title="123">@user');
    expect(html).toContain('data-kind="channel" title="456">#channel');
    expect(html).toContain('data-kind="role" title="789">@role');
  });

  it("uses resolved mention names", () => {
    const html = renderMarkdown("hey <@42>", {
      now: FIXED_NOW,
      resolveMention: (kind, id) => (kind === "user" && id === "42" ? "kasia" : null),
    });
    expect(html).toContain(">kasia</span>");
  });

  it("formats timestamps deterministically in UTC", () => {
    // <t:0:F> = 1970-01-01T00:00:00Z
    expect(render("on <t:0:F>")).toBe(
      '<p>on <span class="d-timestamp">Thursday, January 1, 1970, 00:00</span></p>',
    );
    // 2025-12-24T12:00:00Z is ~8 months before FIXED_NOW
    expect(render("<t:1766577600:R>")).toContain("8 months ago");
  });

  it("renders custom emoji via the CDN by default", () => {
    expect(render("wave <:wave:111>")).toContain(
      'src="https://cdn.discordapp.com/emojis/111.png?size=44"',
    );
  });
});
