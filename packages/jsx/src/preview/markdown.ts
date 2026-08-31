import type { AnyNode } from "@discord/markdown-types";
import { parse, unparse } from "@discord/markdown-wasm/sync";

type MentionKind = "user" | "channel" | "role";

export interface MarkdownOptions {
  locale?: string;
  timeZone?: string;
  now?: Date;
  resolveMention?: (kind: MentionKind, id: string) => string | null | undefined;
}

export const escapeHtml = Bun.escapeHTML;

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

interface Timing {
  locale: string;
  timeZone: string;
  now: Date;
}

function formatTimestamp(unixSeconds: number, style: string, timing: Timing): string {
  const date = new Date(unixSeconds * 1000);
  if (!Number.isFinite(date.getTime())) return "Invalid Date";
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(timing.locale, {
      ...options,
      timeZone: timing.timeZone,
      hourCycle: "h23",
    }).format(date);
  const longDate = () => format({ day: "numeric", month: "long", year: "numeric" });
  const shortTime = () => format({ hour: "2-digit", minute: "2-digit" });

  switch (style) {
    case "t":
      return shortTime();
    case "T":
      return format({ hour: "2-digit", minute: "2-digit", second: "2-digit" });
    case "d":
      return format({ day: "2-digit", month: "2-digit", year: "numeric" });
    case "D":
      return longDate();
    case "F":
      return `${format({ weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${shortTime()}`;
    case "R": {
      const seconds = Math.round((date.getTime() - timing.now.getTime()) / 1000);
      const [unit, unitSeconds] = RELATIVE_UNITS.find(
        ([, limit]) => Math.abs(seconds) >= limit,
      ) ?? ["second", 1];
      return new Intl.RelativeTimeFormat(timing.locale, { numeric: "auto" }).format(
        Math.round(seconds / unitSeconds),
        unit,
      );
    }
    default:
      return `${longDate()}, ${shortTime()}`;
  }
}

const MENTION_LABELS: Record<MentionKind, string> = {
  user: "@user",
  channel: "#channel",
  role: "@role",
};

function renderIdMention(kind: MentionKind, id: string, options: MarkdownOptions): string {
  const label = options.resolveMention?.(kind, id) ?? MENTION_LABELS[kind];
  return `<span class="d-mention" data-kind="${kind}" title="${id}">${escapeHtml(label)}</span>`;
}

function renderCustomEmoji(name: string, id: string, animated: boolean): string {
  const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=44`;
  return `<img class="d-emoji" alt=":${escapeHtml(name)}:" src="${url}">`;
}

interface Context {
  options: MarkdownOptions;
  timing: Timing;
}

function renderAsSource(node: AnyNode): string {
  try {
    const blocks: AnyNode[] = [{ type: "paragraph", value: [node] }];
    return escapeHtml(unparse(blocks as never).trimEnd());
  } catch {
    return "";
  }
}

function renderMention(node: AnyNode, ctx: Context): string {
  const mention = node.value;
  switch (mention.type) {
    case "user":
    case "channel":
    case "role":
      return renderIdMention(mention.type, String(mention.value), ctx.options);
    case "everyone":
    case "here":
      return `<span class="d-mention" data-kind="${mention.type}">@${mention.type}</span>`;
    case "command":
      return `<span class="d-mention" data-kind="command" title="${mention.value.id}">/${escapeHtml(mention.value.name)}</span>`;
    default:
      return renderAsSource(node);
  }
}

function renderLink(node: AnyNode, ctx: Context): string {
  const { text, target } = node.value;
  const label = text ? renderInlines(text, ctx) : null;
  if (target.type === "url" && /^https?:\/\//i.test(target.value)) {
    const href = escapeHtml(target.value);
    return `<a href="${href}" target="_blank" rel="noreferrer noopener">${label ?? href}</a>`;
  }
  return label ?? renderAsSource(node);
}

const WRAPPERS: Record<string, [string, string]> = {
  bold: ["<strong>", "</strong>"],
  italic: ["<em>", "</em>"],
  underline: ["<u>", "</u>"],
  strikethrough: ["<s>", "</s>"],
  spoiler: ['<span class="d-spoiler">', "</span>"],
};

function renderInline(node: AnyNode, ctx: Context): string {
  const wrapper = WRAPPERS[node.type];
  if (wrapper) return `${wrapper[0]}${renderInlines(node.value, ctx)}${wrapper[1]}`;
  switch (node.type) {
    case "text":
      return escapeHtml(node.value).replaceAll("\n", "<br>");
    case "code":
      return `<code class="d-code-inline">${escapeHtml(node.value)}</code>`;
    case "code_block":
      return `<code class="d-pre">${escapeHtml(node.value.content)}</code>`;
    case "timestamp":
      return `<span class="d-timestamp">${escapeHtml(
        formatTimestamp(Number(node.value.value), node.value.style ?? "f", ctx.timing),
      )}</span>`;
    case "mention":
      return renderMention(node, ctx);
    case "emoji": {
      const emoji = node.value;
      return emoji.type === "custom"
        ? renderCustomEmoji(emoji.value.name, String(emoji.value.id), emoji.value.animated)
        : escapeHtml(emoji.value);
    }
    case "link":
      return renderLink(node, ctx);
    default:
      return renderAsSource(node);
  }
}

function renderInlines(nodes: AnyNode[], ctx: Context): string {
  return nodes.map((node) => renderInline(node, ctx)).join("");
}

function renderBlock(node: AnyNode, ctx: Context): string {
  switch (node.type) {
    case "heading":
      return `<h${node.value.level}>${renderInlines(node.value.content, ctx)}</h${node.value.level}>`;
    case "small":
      return `<div class="d-subtext">${renderInlines(node.value.content, ctx)}</div>`;
    case "quote":
      return `<blockquote>${renderBlocks(node.value, ctx)}</blockquote>`;
    case "list": {
      const tag = node.value.type === "ordered" ? "ol" : "ul";
      const start = node.value.value;
      const startAt = tag === "ol" && start !== undefined && start !== 1 ? ` start="${start}"` : "";
      const items = node.value.items
        .map((item: { content: AnyNode[] }) => `<li>${renderBlocks(item.content, ctx)}</li>`)
        .join("");
      return `<${tag}${startAt}>${items}</${tag}>`;
    }
    case "paragraph":
      return `<p>${renderInlines(node.value, ctx)}</p>`;
    case "empty":
      return "<br>";
    default:
      return `<p>${renderAsSource(node)}</p>`;
  }
}

function renderBlocks(blocks: AnyNode[], ctx: Context): string {
  return blocks.map((block) => renderBlock(block, ctx)).join("");
}

export function renderMarkdown(source: string, options: MarkdownOptions = {}): string {
  const ctx: Context = {
    options,
    timing: {
      locale: options.locale ?? "pl-PL",
      timeZone: options.timeZone ?? "UTC",
      now: options.now ?? new Date(),
    },
  };
  return renderBlocks(parse(source), ctx);
}
