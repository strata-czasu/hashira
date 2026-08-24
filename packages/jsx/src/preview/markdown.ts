/**
 * Discord markdown -> HTML converter used by the preview renderer.
 *
 * The input is plain Discord-flavored markdown as found in TextDisplay
 * content. Output is an HTML fragment (no surrounding element). All user
 * content is HTML-escaped before any transformation, so views rendering
 * untrusted state cannot inject markup.
 */

export type MentionKind = "user" | "channel" | "role";

export interface MarkdownRenderOptions {
  /** BCP-47 locale for timestamp formatting (default: `pl-PL`). */
  locale?: string;
  /** Timezone for absolute timestamps (default: `UTC`, keeps snapshots stable). */
  timeZone?: string;
  /** Reference time for relative timestamps (default: now at render time). */
  now?: Date;
  /**
   * Resolve `<@id>` / `<#id>` / `<@&id>` mentions to display names.
   * Return null/undefined for the generic fallback label.
   */
  resolveMention?: (kind: MentionKind, id: string) => string | null | undefined;
  /**
   * Resolve custom emoji to an image URL. Defaults to the public Discord
   * CDN, which needs no credentials.
   */
  resolveEmojiUrl?: (name: string, id: string, animated: boolean) => string | null | undefined;
}

// Private-use code points never collide with real markdown content.
const TOKEN_START = "\uE000";
const TOKEN_END = "\uE001";
const CODE_TOKEN_START = "\uE100";
const CODE_TOKEN_END = "\uE101";

// Bun.escapeHTML escapes &, <, >, " and ' — everything we need for both
// text nodes and double-quoted attribute values.
export const escapeHtml = Bun.escapeHTML;

interface TokenStore {
  keep(html: string): string;
  restore(text: string): string;
}

function createTokenStore(): TokenStore {
  const tokens: string[] = [];
  return {
    keep(html) {
      return `${TOKEN_START}${tokens.push(html) - 1}${TOKEN_END}`;
    },
    restore(text) {
      return text.replaceAll(
        new RegExp(`${TOKEN_START}(\\d+)${TOKEN_END}`, "g"),
        (_, index) => tokens[Number(index)] ?? "",
      );
    },
  };
}

// --- Timestamps -------------------------------------------------------------

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

function formatTimestamp(
  unixSeconds: number,
  style: string,
  context: { locale: string; timeZone: string; now: Date },
): string {
  const date = new Date(unixSeconds * 1000);
  const format = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(context.locale, {
      ...opts,
      timeZone: context.timeZone,
      // Fixed 24-hour cycle keeps snapshots stable across environments.
      hourCycle: "h23",
    }).format(date);

  switch (style) {
    case "t":
      return format({ hour: "2-digit", minute: "2-digit" });
    case "T":
      return format({ hour: "2-digit", minute: "2-digit", second: "2-digit" });
    case "d":
      return format({ day: "2-digit", month: "2-digit", year: "numeric" });
    case "D":
      return format({ day: "numeric", month: "long", year: "numeric" });
    case "F":
      return `${format({ weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${format({ hour: "2-digit", minute: "2-digit" })}`;
    case "R": {
      const seconds = Math.round((date.getTime() - context.now.getTime()) / 1000);
      const rtf = new Intl.RelativeTimeFormat(context.locale, {
        numeric: "auto",
      });
      const abs = Math.abs(seconds);
      for (const [unit, limit] of RELATIVE_UNITS) {
        if (abs >= limit || unit === "second") {
          return rtf.format(Math.round(seconds / limit), unit);
        }
      }
      return rtf.format(seconds, "second");
    }
    default:
      // "f" (and anything unknown): long date + short time
      return `${format({ day: "numeric", month: "long", year: "numeric" })}, ${format({ hour: "2-digit", minute: "2-digit" })}`;
  }
}

function timingContext(options: MarkdownRenderOptions) {
  return {
    locale: options.locale ?? "pl-PL",
    timeZone: options.timeZone ?? "UTC",
    now: options.now ?? new Date(),
  };
}

// --- Mentions / emoji -------------------------------------------------------

function renderMention(kind: MentionKind, id: string, options: MarkdownRenderOptions): string {
  const resolved = options.resolveMention?.(kind, id) ?? null;
  const label = resolved ?? (kind === "channel" ? "#channel" : "@user");
  return `<span class="d-mention" data-kind="${kind}" title="${id}">${escapeHtml(label)}</span>`;
}

function renderEmoji(
  name: string,
  id: string,
  animated: boolean,
  options: MarkdownRenderOptions,
): string {
  const url =
    options.resolveEmojiUrl?.(name, id, animated) ??
    `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=44`;
  if (!/^https?:\/\//.test(url)) return `:${name}:`;
  return `<img class="d-emoji" alt=":${escapeHtml(name)}:" src="${escapeHtml(url)}">`;
}

// --- Inline transforms ------------------------------------------------------

function transformInline(text: string, options: MarkdownRenderOptions): string {
  const store = createTokenStore();
  const keep = store.keep.bind(store);
  const timing = timingContext(options);

  // Timestamps <t:unix:style> (angle brackets are already escaped)
  text = text.replace(/&lt;t:(-?\d+)(?::([a-zA-Z]))?&gt;/g, (_, seconds: string, style?: string) =>
    keep(
      `<span class="d-timestamp">${escapeHtml(formatTimestamp(Number(seconds), style ?? "f", timing))}</span>`,
    ),
  );

  // Mentions (role first so the `&` of `@&` is not swallowed by user matching)
  text = text.replace(/&lt;@&amp;(\d+)&gt;/g, (_, id: string) =>
    keep(renderMention("role", id, options)),
  );
  text = text.replace(/&lt;@!?(\d+)&gt;/g, (_, id: string) =>
    keep(renderMention("user", id, options)),
  );
  text = text.replace(/&lt;#(\d+)&gt;/g, (_, id: string) =>
    keep(renderMention("channel", id, options)),
  );

  // Custom emoji <:name:id> / <a:name:id>
  text = text.replace(
    /&lt;(a?):([a-zA-Z0-9_]+):(\d+)&gt;/g,
    (_, animated: string, name: string, id: string) =>
      keep(renderEmoji(name, id, animated === "a", options)),
  );

  // Masked links [text](https://url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label: string, url: string) =>
    keep(`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer noopener">${label}</a>`),
  );

  // Bare autolinks (placeholder tokens are excluded from the match)
  text = text.replace(
    /[^\s\uE000\uE100]*https?:\/\/[^\s\uE000\uE100]+[^\s\uE000\uE100]*/g,
    (match) => {
      const url = match.replace(/[.,;:!?)\]]+$/, "");
      const rest = match.slice(url.length);
      return keep(
        `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(url)}</a>`,
      ).concat(rest);
    },
  );

  // Emphasis, longest delimiters first
  text = text.replace(/\|\|([\s\S]+?)\|\|/g, (_, inner: string) =>
    keep(`<span class="d-spoiler">${inner}</span>`),
  );
  text = text.replace(/\*\*\*([\s\S]+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([\s\S]+?)__/g, "<u>$1</u>");
  text = text.replace(/~~([\s\S]+?)~~/g, "<s>$1</s>");
  text = text.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  text = text.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "<em>$1</em>");

  return store.restore(text);
}

// --- Block structure --------------------------------------------------------

const HEADING_PATTERN = /^(#{1,3})\s+(.*)$/;
const SUBTEXT_PATTERN = /^-#\s+(.*)$/;
const QUOTE_PATTERN = /^&gt;\s?(.*)$/;
const UL_PATTERN = /^[-*]\s+(.*)$/;
const OL_PATTERN = /^(\d+)[.)]\s+(.*)$/;

interface ListState {
  ordered: boolean;
  items: string[];
}

function transformBlocks(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];

  let paragraph: string[] = [];
  let quote: string[] | null = null;
  let list: ListState | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) out.push(`<p>${paragraph.join("<br>")}</p>`);
    paragraph = [];
  };
  const flushQuote = () => {
    if (quote !== null) {
      out.push(`<blockquote>${quote.join("<br>")}</blockquote>`);
      quote = null;
    }
  };
  const flushList = () => {
    if (list !== null) {
      const tag = list.ordered ? "ol" : "ul";
      out.push(`<${tag}>${list.items.map((item) => `<li>${item}</li>`).join("")}</${tag}>`);
      list = null;
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  for (const line of lines) {
    if (line.trim() === "") {
      flushAll();
      continue;
    }

    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1]?.length ?? 0;
      out.push(`<h${level}>${heading[2] ?? ""}</h${level}>`);
      continue;
    }

    const subtext = SUBTEXT_PATTERN.exec(line);
    if (subtext) {
      flushAll();
      out.push(`<div class="d-subtext">${subtext[1] ?? ""}</div>`);
      continue;
    }

    const quoted = QUOTE_PATTERN.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      quote ??= [];
      quote.push(quoted[1] ?? "");
      continue;
    }

    const unordered = UL_PATTERN.exec(line);
    if (unordered) {
      flushParagraph();
      flushQuote();
      if (list?.ordered) flushList();
      list ??= { ordered: false, items: [] };
      list.items.push(unordered[1] ?? "");
      continue;
    }

    const ordered = OL_PATTERN.exec(line);
    if (ordered) {
      flushParagraph();
      flushQuote();
      if (list && !list.ordered) flushList();
      list ??= { ordered: true, items: [] };
      list.items.push(ordered[2] ?? "");
      continue;
    }

    flushQuote();
    flushList();
    paragraph.push(line);
  }

  flushAll();
  return out.join("");
}

// --- Public API --------------------------------------------------------------

interface ExtractedCode {
  code: string;
  inline: boolean;
}

export function renderDiscordMarkdown(source: string, options: MarkdownRenderOptions = {}): string {
  const codes: ExtractedCode[] = [];
  let text = source.replace(
    /```(?:(\S+)\r?\n)?([\s\S]*?)```/g,
    (_, _language: string | undefined, code: string) => {
      codes.push({ code, inline: false });
      return `${CODE_TOKEN_START}${codes.length - 1}${CODE_TOKEN_END}`;
    },
  );
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) => {
    codes.push({ code, inline: true });
    return `${CODE_TOKEN_START}${codes.length - 1}${CODE_TOKEN_END}`;
  });

  text = escapeHtml(text);
  text = transformInline(text, options);
  text = transformBlocks(text);

  text = text.replaceAll(
    new RegExp(`${CODE_TOKEN_START}(\\d+)${CODE_TOKEN_END}`, "g"),
    (_, index: string) => {
      const token = codes[Number(index)];
      if (!token) return "";
      if (token.inline) {
        return `<code class="d-code-inline">${escapeHtml(token.code)}</code>`;
      }
      return `<pre class="d-pre"><code>${escapeHtml(token.code)}</code></pre>`;
    },
  );

  return text;
}
