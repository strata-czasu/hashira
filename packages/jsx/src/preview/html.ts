import {
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIComponentInMessageActionRow,
  type APIContainerComponent,
  type APIFileComponent,
  type APIMediaGalleryComponent,
  type APIMediaGalleryItem,
  type APIMessageTopLevelComponent,
  type APISectionComponent,
  type APISelectMenuComponent,
  type APISeparatorComponent,
  type APITextDisplayComponent,
  type APIThumbnailComponent,
  ButtonStyle,
  ComponentType,
  SeparatorSpacingSize,
} from "discord.js";

import { type MarkdownRenderOptions, renderDiscordMarkdown } from "./markdown";
import { PREVIEW_CSS, type PreviewTheme } from "./theme";

/**
 * Renders Discord API message components (the JSON produced by discord.js
 * builders' toJSON()) into a self-contained HTML document that approximates
 * how the client displays Components V2. Inspired by discohook's preview
 * components, but producing static server-side HTML instead of React.
 */

export interface HtmlRenderOptions {
  /** Visual theme (default: `dark`). */
  theme?: PreviewTheme | undefined;
  /** Width of the rendered page in CSS pixels (default: `600`). */
  width?: number | undefined;
  /**
   * Resolves `attachment://filename` URLs used by thumbnails, galleries and
   * files. Values are usually data URIs built from the view's files.
   */
  attachments?: Record<string, string> | undefined;
  /** Options forwarded to the markdown renderer (mentions, locale, ...). */
  markdown?: MarkdownRenderOptions | undefined;
}

interface RenderContext {
  attachments: Record<string, string>;
  markdown: MarkdownRenderOptions;
}

const CHEVRON_SVG =
  '<svg class="d-chevron" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.3 9.3a1 1 0 0 1 1.4 0l5.3 5.29 5.3-5.3a1 1 0 1 1 1.4 1.42l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.41z"/></svg>';

const FILE_ICON_SVG =
  '<svg class="d-file-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9z"/></svg>';

// --- Helpers ----------------------------------------------------------------

// Bun.escapeHTML escapes &, <, >, " and ' — safe for double-quoted attributes.
const escapeAttr = Bun.escapeHTML;

function resolveMediaUrl(url: string, context: RenderContext): string {
  if (!url.startsWith("attachment://")) return url;
  const name = url.slice("attachment://".length);
  return context.attachments[name] ?? url;
}

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split("/").pop() ?? "file");
  } catch {
    return url;
  }
}

function renderComponentEmoji(
  emoji: { name?: string; id?: string; animated?: boolean } | undefined,
): string {
  if (!emoji) return "";
  if (emoji.id) {
    const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=32`;
    return `<img class="d-emoji" alt="${escapeAttr(emoji.name ?? "")}" src="${escapeAttr(url)}">`;
  }
  if (emoji.name) return escapeAttr(emoji.name);
  return "";
}

// --- Leaf renderers ---------------------------------------------------------

function renderTextDisplay(component: APITextDisplayComponent, context: RenderContext): string {
  return `<div class="d-md">${renderDiscordMarkdown(component.content, context.markdown)}</div>`;
}

function renderButton(component: APIButtonComponent): string {
  const styles = {
    [ButtonStyle.Primary]: "d-btn-primary",
    [ButtonStyle.Secondary]: "d-btn-secondary",
    [ButtonStyle.Success]: "d-btn-success",
    [ButtonStyle.Danger]: "d-btn-danger",
    [ButtonStyle.Link]: "d-btn-secondary",
    [ButtonStyle.Premium]: "d-btn-premium",
  };
  const styleClass = styles[component.style as ButtonStyle] ?? "d-btn-secondary";
  const disabled = "disabled" in component && component.disabled ? " d-disabled" : "";
  const emoji = renderComponentEmoji("emoji" in component ? component.emoji : undefined);
  const label = "label" in component && component.label ? escapeAttr(component.label) : "";

  const inner = `${emoji}${label}` || "SKU";

  return `<span class="d-btn ${styleClass}${disabled}">${inner}</span>`;
}

function selectFallbackLabel(type: ComponentType): string {
  switch (type) {
    case ComponentType.UserSelect:
      return "@user";
    case ComponentType.RoleSelect:
      return "@role";
    case ComponentType.ChannelSelect:
      return "#channel";
    default:
      return "Make a selection";
  }
}

function renderSelectMenu(component: APISelectMenuComponent): string {
  const disabled = "disabled" in component && component.disabled ? " d-disabled" : "";

  let label: string;
  if (component.type === ComponentType.StringSelect) {
    const selected = component.options
      .filter((option) => option.default)
      .map((option) => option.label);
    label = selected.join(", ") || component.placeholder || selectFallbackLabel(component.type);
  } else {
    label = component.placeholder || selectFallbackLabel(component.type);
  }

  return `<span class="d-select${disabled}"><span class="d-select-label">${escapeAttr(label)}</span>${CHEVRON_SVG}</span>`;
}

function renderActionRow(component: APIActionRowComponent<APIComponentInMessageActionRow>): string {
  const children = component.components
    .map((child) =>
      child.type === ComponentType.Button ? renderButton(child) : renderSelectMenu(child),
    )
    .join("");
  return `<div class="d-row">${children}</div>`;
}

function renderThumbnail(thumbnail: APIThumbnailComponent, context: RenderContext): string {
  const url = resolveMediaUrl(thumbnail.media.url, context);
  const spoiled = thumbnail.spoiler ? " d-spoilered" : "";
  return `<img class="d-thumbnail${spoiled}" src="${escapeAttr(url)}" alt="${escapeAttr(thumbnail.description ?? "")}">`;
}

function renderSection(component: APISectionComponent, context: RenderContext): string {
  const body = component.components.map((child) => renderTextDisplay(child, context)).join("");
  const { accessory } = component;
  const renderedAccessory =
    accessory.type === ComponentType.Button
      ? renderButton(accessory)
      : renderThumbnail(accessory, context);
  return `<div class="d-section"><div class="d-section-body">${body}</div><div class="d-accessory">${renderedAccessory}</div></div>`;
}

function renderSeparator(component: APISeparatorComponent): string {
  const divided = component.divider === false ? "" : " d-divided";
  const spacing = component.spacing === SeparatorSpacingSize.Large ? " d-spacing-large" : "";
  return `<hr class="d-separator${divided}${spacing}">`;
}

function galleryColumns(count: number): number {
  if (count <= 1) return 1;
  if (count === 2 || count === 4) return 2;
  return 3;
}

function galleryRowHeight(columns: number): number {
  return columns <= 2 ? 200 : 140;
}

function renderMediaGallery(component: APIMediaGalleryComponent, context: RenderContext): string {
  const columns = galleryColumns(component.items.length);
  const height = galleryRowHeight(columns);
  const items = component.items
    .map((item: APIMediaGalleryItem) => {
      const url = resolveMediaUrl(item.media.url, context);
      const spoiled = item.spoiler ? " d-spoilered" : "";
      return `<div class="d-gallery-item${spoiled}" style="height:${height}px"><img src="${escapeAttr(url)}" alt="${escapeAttr(item.description ?? "")}"></div>`;
    })
    .join("");
  return `<div class="d-gallery" style="grid-template-columns:repeat(${columns}, minmax(0, 1fr))">${items}</div>`;
}

function renderFile(component: APIFileComponent, context: RenderContext): string {
  const url = resolveMediaUrl(component.file.url, context);
  const name = escapeAttr(fileNameFromUrl(url));
  return `<div class="d-file-card">${FILE_ICON_SVG}<span class="d-file-name">${name}</span></div>`;
}

function renderContainer(component: APIContainerComponent, context: RenderContext): string {
  const children = componentsToFragment(component.components, context);
  const accent =
    component.accent_color != null
      ? ` style="--d-accent:#${component.accent_color.toString(16).padStart(6, "0")}"`
      : "";
  const classes = [
    "d-container",
    ...(component.accent_color != null ? ["d-accent"] : []),
    ...(component.spoiler ? ["d-spoiler-wrap"] : []),
  ].join(" ");
  const inner = component.spoiler ? `<div class="d-spoiled">${children}</div>` : children;
  return `<div class="${classes}"${accent}>${inner}</div>`;
}

// --- Public surface ---------------------------------------------------------

function createContext(options: HtmlRenderOptions): RenderContext & {
  theme: PreviewTheme;
  width: number;
} {
  return {
    theme: options.theme ?? "dark",
    width: options.width ?? 600,
    attachments: options.attachments ?? {},
    markdown: options.markdown ?? {},
  };
}

function componentsToFragment(
  components: readonly APIMessageTopLevelComponent[],
  context: RenderContext,
): string {
  return components
    .map((component) => {
      switch (component.type) {
        case ComponentType.ActionRow:
          return renderActionRow(component);
        case ComponentType.Container:
          return renderContainer(component, context);
        case ComponentType.Section:
          return renderSection(component, context);
        case ComponentType.TextDisplay:
          return renderTextDisplay(component, context);
        case ComponentType.MediaGallery:
          return renderMediaGallery(component, context);
        case ComponentType.File:
          return renderFile(component, context);
        case ComponentType.Separator:
          return renderSeparator(component);
        default:
          // Unsupported component types are skipped silently.
          return "";
      }
    })
    .join("");
}

function componentsToBodyWithContext(
  components: readonly APIMessageTopLevelComponent[],
  context: RenderContext,
): string {
  return `<div class="d-components">${componentsToFragment(components, context)}</div>`;
}

/** Renders components to the inner `.d-components` fragment (no page shell). */
export function renderComponentsToBody(
  components: readonly APIMessageTopLevelComponent[],
  options: HtmlRenderOptions = {},
): string {
  return componentsToBodyWithContext(components, createContext(options));
}

/** Renders components to a complete, self-contained HTML document. */
export function renderComponentsToHtml(
  components: readonly APIMessageTopLevelComponent[],
  options: HtmlRenderOptions = {},
): string {
  const context = createContext(options);
  const body = componentsToBodyWithContext(components, context);
  return documentShell(body, context);
}

export function documentShell(
  bodyInner: string,
  context: RenderContext & {
    theme: PreviewTheme;
    width: number;
  },
): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>preview</title>
<style>${PREVIEW_CSS}</style>
</head>
<body data-d-theme="${context.theme}">
<div class="d-page" style="width:${context.width}px">${bodyInner}</div>
</body>
</html>`;
}

export interface ComparisonPanelInput {
  label: string;
  /** Tone picks the label color. */
  tone: "before" | "after";
  /** Pre-rendered `.d-components` fragment. */
  body: string;
}

export interface ComparisonHtmlOptions extends HtmlRenderOptions {
  layout?: "side-by-side" | "stacked";
  /** Width of each individual panel (default: 520). */
  panelWidth?: number;
}

/** Renders labeled panels side by side (or stacked) into one document. */
export function renderPanelsToHtml(
  panels: readonly ComparisonPanelInput[],
  options: ComparisonHtmlOptions = {},
): string {
  const context = createContext(options);
  const stacked = options.layout === "stacked" ? " d-stacked" : "";
  const panelWidth = options.panelWidth ?? 520;

  const columns = panels
    .map(
      (panel) => `
<div class="d-col">
  <span class="d-label d-label-${panel.tone}">${escapeAttr(panel.label)}</span>
  <div class="d-page d-panel" style="width:${panelWidth}px">${panel.body}</div>
</div>`,
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>comparison</title>
<style>${PREVIEW_CSS}</style>
</head>
<body data-d-theme="${context.theme}">
<div class="d-compare${stacked}">${columns}
</div>
</body>
</html>`;
}
