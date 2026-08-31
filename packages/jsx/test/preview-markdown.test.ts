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
    expect(render("# Title\n## Sub\n### Minor\n-# footnote")).toMatchInlineSnapshot(
      `"<h1>Title</h1><h2>Sub</h2><h3>Minor</h3><div class="d-subtext">footnote</div>"`,
    );
  });

  it("renders subtext per line and respects escapes", () => {
    expect(render("line1\n-# line2\nline3")).toBe(
      '<p>line1</p><div class="d-subtext">line2</div><p>line3</p>',
    );
    expect(render("\\-# escaped")).toBe("<p>-# escaped</p>");
  });

  it("renders emphasis", () => {
    expect(render("**bold** *em* __under__ ~~strike~~ ***both***")).toMatchInlineSnapshot(
      `"<p><strong>bold</strong> <em>em</em> <u>under</u> <s>strike</s> <strong><em>both</em></strong></p>"`,
    );
  });

  it("does not transform markdown inside code", () => {
    expect(render("`**bold** ||spoiler|| <@123>`\n\n```js\n__block__ <t:0:F>\n```"))
      .toMatchInlineSnapshot(`
      "<p><code class="d-code-inline">**bold** ||spoiler|| &lt;@123&gt;</code></p><pre class="d-pre"><code>__block__ &lt;t:0:F&gt;
      </code></pre>"
    `);
  });

  it("renders spoilers", () => {
    expect(render("||**secret**||")).toMatchInlineSnapshot(
      `"<p><span class="d-spoiler"><strong>secret</strong></span></p>"`,
    );
  });

  it("spans spoilers over line breaks like Discord does", () => {
    expect(render("||a\nb||")).toBe('<p><span class="d-spoiler">a<br>b</span></p>');
    expect(render("||a\n\nb||")).toBe('<p><span class="d-spoiler">a<br><br>b</span></p>');
    expect(render("- a __one\n- b__ two")).toBe("<ul><li>a __one</li><li>b__ two</li></ul>");
  });

  it("preserves private-use characters instead of corrupting output", () => {
    expect(render("icon \uE101 font ||spoiler||")).toBe(
      '<p>icon \uE101 font <span class="d-spoiler">spoiler</span></p>',
    );
    expect(render("a \uE000 3 \uE001 b")).toBe("<p>a \uE000 3 \uE001 b</p>");
  });

  it("groups quotes and lists", () => {
    expect(render("> line one\n> line two\n- a\n- b\n1. one\n2. two")).toMatchInlineSnapshot(
      `"<blockquote><p>line one<br>line two</p></blockquote><ul><li>a</li><li>b</li></ul><ol><li>one</li><li>two</li></ol>"`,
    );
  });

  it("joins consecutive lines in a paragraph with <br>", () => {
    expect(render("a\nb")).toBe("<p>a<br>b</p>");
  });

  it("renders masked links and blocks unsafe urls", () => {
    expect(render("[click](https://example.com)")).toMatchInlineSnapshot(
      `"<p><a href="https://example.com/" target="_blank" rel="noreferrer noopener">click</a></p>"`,
    );
    expect(render("[x](javascript:alert(1))")).toBe("<p>[x](javascript:alert(1))</p>");
  });

  it("renders mentions as pills with fallback labels", () => {
    expect(render("hi <@123> <#456> <@&789>")).toMatchInlineSnapshot(
      `"<p>hi <span class="d-mention" data-kind="user" title="123">@user</span> <span class="d-mention" data-kind="channel" title="456">#channel</span> <span class="d-mention" data-kind="role" title="789">@role</span></p>"`,
    );
  });

  it("uses resolved mention names", () => {
    const html = renderMarkdown("hey <@42>", {
      now: FIXED_NOW,
      resolveMention: (kind, id) => (kind === "user" && id === "42" ? "kasia" : null),
    });
    expect(html).toMatchInlineSnapshot(
      `"<p>hey <span class="d-mention" data-kind="user" title="42">kasia</span></p>"`,
    );
  });

  it("formats timestamps deterministically in UTC", () => {
    // <t:0:F> = 1970-01-01T00:00:00Z
    expect(render("on <t:0:F>")).toBe(
      '<p>on <span class="d-timestamp">Thursday, January 1, 1970, 00:00</span></p>',
    );
    // 2025-12-24T12:00:00Z is ~8 months before FIXED_NOW
    expect(render("<t:1766577600:R>")).toMatchInlineSnapshot(
      `"<p><span class="d-timestamp">8 months ago</span></p>"`,
    );
  });

  it("survives out-of-range timestamps", () => {
    expect(render("<t:99999999999999:F>")).toBe(
      '<p><span class="d-timestamp">Invalid Date</span></p>',
    );
    expect(render("<t:99999999999999:R>")).toBe(
      '<p><span class="d-timestamp">Invalid Date</span></p>',
    );
  });

  it("renders custom emoji via the CDN by default", () => {
    expect(render("wave <:wave:111>")).toMatchInlineSnapshot(
      `"<p>wave <img class="d-emoji" alt=":wave:" src="https://cdn.discordapp.com/emojis/111.png?size=44"></p>"`,
    );
  });
});
