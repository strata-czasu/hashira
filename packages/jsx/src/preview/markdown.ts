type MentionKind = "user" | "channel" | "role";

export interface MarkdownOptions {
  /** BCP-47 locale for timestamp formatting (default: `pl-PL`). */
  locale?: string;
  /** Timezone for absolute timestamps (default: `UTC`, keeps snapshots stable). */
  timeZone?: string;
  /** Reference time for relative timestamps (default: now at render time). */
  now?: Date;
  /** Resolve `<@id>` / `<#id>` / `<@&id>` mentions to display names. */
  resolveMention?: (kind: MentionKind, id: string) => string | null | undefined;
  /** Resolve custom emoji to an image URL (default: the public Discord CDN). */
  resolveEmojiUrl?: (name: string, id: string, animated: boolean) => string;
}

export const escapeHtml = Bun.escapeHTML;

const TOKEN_START = "\uE000";
const TOKEN_END = "\uE001";
const UNDERLINE = "\uE100";
const SPOILER = "\uE101";
const CODE = /(```[\s\S]*?```|`[^`\n]+`)/g;

function createTokenStore() {
  const fragments: string[] = [];
  return {
    keep(html: string): string {
      return `${TOKEN_START}${fragments.push(html) - 1}${TOKEN_END}`;
    },
    restore(text: string): string {
      return text.replaceAll(
        new RegExp(`${TOKEN_START}(\\d+)${TOKEN_END}`, "g"),
        (_, index) => fragments[Number(index)] ?? "",
      );
    },
  };
}

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

function renderMention(kind: MentionKind, id: string, options: MarkdownOptions): string {
  const label = options.resolveMention?.(kind, id) ?? MENTION_LABELS[kind];
  return `<span class="d-mention" data-kind="${kind}" title="${id}">${escapeHtml(label)}</span>`;
}

function renderEmoji(
  name: string,
  id: string,
  animated: boolean,
  options: MarkdownOptions,
): string {
  const url =
    options.resolveEmojiUrl?.(name, id, animated) ??
    `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=44`;
  return `<img class="d-emoji" alt=":${escapeHtml(name)}:" src="${escapeHtml(url)}">`;
}

function preprocess(
  source: string,
  options: MarkdownOptions,
  timing: Timing,
  keep: (html: string) => string,
): string {
  return source
    .split(CODE)
    .map((part, index) => {
      if (index % 2 === 1) return part;

      part = part.replace(/<t:(-?\d+)(?::([a-zA-Z]))?>/g, (_, seconds: string, style?: string) =>
        keep(
          `<span class="d-timestamp">${escapeHtml(formatTimestamp(Number(seconds), style ?? "f", timing))}</span>`,
        ),
      );
      part = part.replace(/<@&(\d+)>/g, (_, id: string) =>
        keep(renderMention("role", id, options)),
      );
      part = part.replace(/<@!?(\d+)>/g, (_, id: string) =>
        keep(renderMention("user", id, options)),
      );
      part = part.replace(/<#(\d+)>/g, (_, id: string) =>
        keep(renderMention("channel", id, options)),
      );
      part = part.replace(
        /<(a?):([a-zA-Z0-9_]+):(\d+)>/g,
        (_, animated: string, name: string, id: string) =>
          keep(renderEmoji(name, id, animated === "a", options)),
      );

      return part.replaceAll("__", UNDERLINE).replaceAll("||", SPOILER);
    })
    .join("");
}

function restoreDelimiters(text: string): string {
  return text.replaceAll(UNDERLINE, "__").replaceAll(SPOILER, "||");
}

const PARSER_OPTIONS = {
  tables: false,
  tasklists: false,
  autolinks: { url: true },
  // TODO: Use hardSoftBreaks once oven-sh/bun#39491 is available in the pinned Bun version.
  noHtmlBlocks: true,
  noHtmlSpans: true,
  noIndentedCodeBlocks: true,
} satisfies Bun.markdown.Options;

export function renderMarkdown(source: string, options: MarkdownOptions = {}): string {
  const store = createTokenStore();
  const timing: Timing = {
    locale: options.locale ?? "pl-PL",
    timeZone: options.timeZone ?? "UTC",
    now: options.now ?? new Date(),
  };

  let html = Bun.markdown.render(
    preprocess(source, options, timing, store.keep),
    {
      text: escapeHtml,
      paragraph: (children) => {
        const body = children.replaceAll("\n", "<br>");
        return body.startsWith("-# ")
          ? `<div class="d-subtext">${body.slice(3)}</div>`
          : `<p>${body}</p>`;
      },
      heading: (children, { level }) =>
        level <= 3
          ? `<h${level}>${children}</h${level}>`
          : `<p>${"#".repeat(level)} ${children}</p>`,
      blockquote: (children) => `<blockquote>${children}</blockquote>`,
      list: (children, { ordered, start }) => {
        const tag = ordered ? "ol" : "ul";
        const startAt = ordered && start !== undefined && start !== 1 ? ` start="${start}"` : "";
        return `<${tag}${startAt}>${children}</${tag}>`;
      },
      listItem: (children) => `<li>${children}</li>`,
      hr: () => "<hr>",
      strong: (children) => `<strong>${children}</strong>`,
      emphasis: (children) => `<em>${children}</em>`,
      strikethrough: (children) => `<s>${children}</s>`,
      codespan: (children) => `<code class="d-code-inline">${children}</code>`,
      code: (children) => `<pre class="d-pre"><code>${children}</code></pre>`,
      link: (children, { href }) => {
        href = restoreDelimiters(href);
        return /^https?:\/\//i.test(href)
          ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${children}</a>`
          : children;
      },
      image: (children) => children,
    },
    PARSER_OPTIONS,
  );

  html = html.replaceAll(new RegExp(`${UNDERLINE}([\\s\\S]+?)${UNDERLINE}`, "g"), "<u>$1</u>");
  html = html.replaceAll(
    new RegExp(`${SPOILER}([\\s\\S]+?)${SPOILER}`, "g"),
    '<span class="d-spoiler">$1</span>',
  );
  html = restoreDelimiters(html);
  return store.restore(html);
}
