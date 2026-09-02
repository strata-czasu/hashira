import {
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIComponentInMessageActionRow,
  type APIContainerComponent,
  type APIFileComponent,
  type APIMediaGalleryComponent,
  type APIMediaGalleryItem,
  type APIMessageComponentEmoji,
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

import { escapeHtml, type MarkdownOptions, renderMarkdown } from "./markdown";
import { PREVIEW_CSS } from "./theme";

export interface PreviewOptions {
  attachments?: Record<string, string>;
  markdown?: MarkdownOptions;
}

const CHEVRON_SVG =
  '<svg class="d-chevron" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.3 9.3a1 1 0 0 1 1.4 0l5.3 5.29 5.3-5.3a1 1 0 1 1 1.4 1.42l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.41z"/></svg>';

const FILE_ICON_SVG =
  '<svg class="d-file-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9z"/></svg>';

function resolveMediaUrl(url: string, options: PreviewOptions): string {
  if (!url.startsWith("attachment://")) return url;
  return options.attachments?.[url.slice("attachment://".length)] ?? url;
}

function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "file");
  } catch {
    return url;
  }
}

function renderComponentEmoji(emoji: APIMessageComponentEmoji | undefined): string {
  if (!emoji?.name) return "";
  if (!emoji.id) return escapeHtml(emoji.name);
  const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=32`;
  return `<img class="d-emoji" alt="${escapeHtml(emoji.name)}" src="${escapeHtml(url)}">`;
}

function renderTextDisplay(component: APITextDisplayComponent, options: PreviewOptions): string {
  return `<div class="d-md">${renderMarkdown(component.content, options.markdown)}</div>`;
}

const BUTTON_STYLE_CLASSES: Record<ButtonStyle, string> = {
  [ButtonStyle.Primary]: "d-btn-primary",
  [ButtonStyle.Secondary]: "d-btn-secondary",
  [ButtonStyle.Success]: "d-btn-success",
  [ButtonStyle.Danger]: "d-btn-danger",
  [ButtonStyle.Link]: "d-btn-secondary",
  [ButtonStyle.Premium]: "d-btn-premium",
};

function renderButton(component: APIButtonComponent): string {
  const styleClass = BUTTON_STYLE_CLASSES[component.style];
  const disabled = component.disabled ? " d-disabled" : "";
  const emoji = renderComponentEmoji("emoji" in component ? component.emoji : undefined);
  const label = "label" in component && component.label ? escapeHtml(component.label) : "";
  const inner = `${emoji}${label}` || ("sku_id" in component ? "SKU" : "");
  return `<span class="d-btn ${styleClass}${disabled}">${inner}</span>`;
}

const SELECT_PLACEHOLDERS: Partial<Record<ComponentType, string>> = {
  [ComponentType.UserSelect]: "@user",
  [ComponentType.RoleSelect]: "@role",
  [ComponentType.ChannelSelect]: "#channel",
};

function renderSelectMenu(component: APISelectMenuComponent): string {
  const disabled = component.disabled ? " d-disabled" : "";
  const selected =
    component.type === ComponentType.StringSelect
      ? component.options
          .filter((option) => option.default)
          .map((option) => option.label)
          .join(", ")
      : "";
  const label =
    selected || component.placeholder || SELECT_PLACEHOLDERS[component.type] || "Make a selection";
  return `<span class="d-select${disabled}"><span class="d-select-label">${escapeHtml(label)}</span>${CHEVRON_SVG}</span>`;
}

function renderActionRow(component: APIActionRowComponent<APIComponentInMessageActionRow>): string {
  const children = component.components
    .map((child) =>
      child.type === ComponentType.Button ? renderButton(child) : renderSelectMenu(child),
    )
    .join("");
  return `<div class="d-row">${children}</div>`;
}

function renderThumbnail(thumbnail: APIThumbnailComponent, options: PreviewOptions): string {
  const url = resolveMediaUrl(thumbnail.media.url, options);
  const spoiled = thumbnail.spoiler ? " d-spoilered" : "";
  return `<img class="d-thumbnail${spoiled}" src="${escapeHtml(url)}" alt="${escapeHtml(thumbnail.description ?? "")}">`;
}

function renderSection(component: APISectionComponent, options: PreviewOptions): string {
  const body = component.components.map((child) => renderTextDisplay(child, options)).join("");
  const accessory =
    component.accessory.type === ComponentType.Button
      ? renderButton(component.accessory)
      : renderThumbnail(component.accessory, options);
  return `<div class="d-section"><div class="d-section-body">${body}</div><div class="d-accessory">${accessory}</div></div>`;
}

function renderSeparator(component: APISeparatorComponent): string {
  const divided = component.divider === false ? "" : " d-divided";
  const spacing = component.spacing === SeparatorSpacingSize.Large ? " d-spacing-large" : "";
  return `<hr class="d-separator${divided}${spacing}">`;
}

function renderMediaGallery(component: APIMediaGalleryComponent, options: PreviewOptions): string {
  const count = component.items.length;
  const columns = count <= 1 ? 1 : count === 2 || count === 4 ? 2 : 3;
  const height = columns <= 2 ? 200 : 140;
  const items = component.items
    .map((item: APIMediaGalleryItem) => {
      const url = resolveMediaUrl(item.media.url, options);
      const spoiled = item.spoiler ? " d-spoilered" : "";
      return `<div class="d-gallery-item${spoiled}" style="height:${height}px"><img src="${escapeHtml(url)}" alt="${escapeHtml(item.description ?? "")}"></div>`;
    })
    .join("");
  return `<div class="d-gallery" style="grid-template-columns:repeat(${columns}, minmax(0, 1fr))">${items}</div>`;
}

function renderFile(component: APIFileComponent): string {
  const url = component.file.url;
  const name = escapeHtml(
    url.startsWith("attachment://") ? url.slice("attachment://".length) : fileNameFromUrl(url),
  );
  return `<div class="d-file-card">${FILE_ICON_SVG}<span class="d-file-name">${name}</span></div>`;
}

function renderContainer(component: APIContainerComponent, options: PreviewOptions): string {
  const children = renderComponentList(component.components, options);
  const accent = component.accent_color;
  const cls = accent == null ? "d-container" : "d-container d-accent";
  const style =
    accent == null ? "" : ` style="--d-accent:#${accent.toString(16).padStart(6, "0")}"`;
  const inner = component.spoiler ? `<div class="d-spoiled">${children}</div>` : children;
  return `<div class="${cls}"${style}>${inner}</div>`;
}

function renderComponent(component: APIMessageTopLevelComponent, options: PreviewOptions): string {
  switch (component.type) {
    case ComponentType.ActionRow:
      return renderActionRow(component);
    case ComponentType.Container:
      return renderContainer(component, options);
    case ComponentType.Section:
      return renderSection(component, options);
    case ComponentType.TextDisplay:
      return renderTextDisplay(component, options);
    case ComponentType.MediaGallery:
      return renderMediaGallery(component, options);
    case ComponentType.File:
      return renderFile(component);
    case ComponentType.Separator:
      return renderSeparator(component);
    default:
      return "";
  }
}

function renderComponentList(
  components: readonly APIMessageTopLevelComponent[],
  options: PreviewOptions,
): string {
  return components.map((component) => renderComponent(component, options)).join("");
}

export function renderComponents(
  components: readonly APIMessageTopLevelComponent[],
  options: PreviewOptions = {},
): string {
  return `<div class="d-components">${renderComponentList(components, options)}</div>`;
}

export function renderPage(
  components: readonly APIMessageTopLevelComponent[],
  options: PreviewOptions = {},
): string {
  return shell("preview", `<div class="d-page">${renderComponents(components, options)}</div>`);
}

interface ComparisonPanel {
  label: string;
  body: string;
}

export function renderComparison(
  before: ComparisonPanel,
  after: ComparisonPanel,
  options: PreviewOptions & { stacked?: boolean } = {},
): string {
  const column = (panel: ComparisonPanel, tone: "before" | "after") => `
<div class="d-col">
  <span class="d-label d-label-${tone}">${escapeHtml(panel.label)}</span>
  <div class="d-page d-panel">${panel.body}</div>
</div>`;
  const stacked = options.stacked ? " d-stacked" : "";
  const columns = `${column(before, "before")}\n${column(after, "after")}`;
  return shell("comparison", `<div class="d-compare${stacked}">${columns}\n</div>`);
}

function shell(title: string, body: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${PREVIEW_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}
