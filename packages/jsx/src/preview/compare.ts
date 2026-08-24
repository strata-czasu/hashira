import type { APIMessageTopLevelComponent } from "discord.js";
import { AttachmentBuilder } from "discord.js";

import { render } from "../render";
import type { JSXNode } from "../types";
import {
  type ComparisonPanelInput,
  type HtmlRenderOptions,
  renderComponentsToBody,
  renderComponentsToHtml,
  renderPanelsToHtml,
} from "./html";
import { type ScreenshotOptions, type ScreenshotResult, screenshotHtml } from "./screenshot";

/**
 * High-level preview helpers: turn JSX views (or arbitrary HTML) into PNGs
 * suitable for before/after comparisons.
 *
 * ```ts
 * const png = await renderViewToPng(<PlayerView state={snapshot} />);
 * const cmp = await renderViewComparisonToPng({
 *   before: <OldView state={snapshot} />,
 *   after: <NewView state={snapshot} />,
 * });
 * ```
 */

// --- View -> API components -------------------------------------------------

/** Reconciles a JSX view into plain Discord API component JSON. */
export function viewToApiComponents(element: JSXNode): APIMessageTopLevelComponent[] {
  const { components } = render(element);
  // render() always produces builders; the exported union also admits plain
  // data shapes, which never occur here.
  return (components as { toJSON(): APIMessageTopLevelComponent }[]).map((component) =>
    component.toJSON(),
  );
}

const IMAGE_MIME_TYPES: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function attachmentToDataUri(attachment: AttachmentBuilder): string | null {
  const { name, attachment: file } = attachment;
  if (!name) return null;

  if (typeof file === "string") {
    // Remote URLs can be referenced as-is; local paths cannot be inlined.
    return /^https?:\/\//.test(file) ? file : null;
  }
  if (Buffer.isBuffer(file)) {
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    const mime = IMAGE_MIME_TYPES[extension] ?? "application/octet-stream";
    return `data:${mime};base64,${file.toString("base64")}`;
  }
  return null;
}

function attachmentsMap(
  files: ReturnType<typeof render>["files"],
): Record<string, string> | undefined {
  const map: Record<string, string> = {};
  for (const file of files) {
    if (!(file instanceof AttachmentBuilder)) continue;
    const uri = attachmentToDataUri(file);
    if (uri && file.name) map[file.name] = uri;
  }
  return Object.keys(map).length > 0 ? map : undefined;
}

// --- Single view ------------------------------------------------------------

/** Renders a JSX view to a complete HTML document (no browser required). */
export function renderViewToHtml(element: JSXNode, options: HtmlRenderOptions = {}): string {
  const rendered = render(element);
  return renderComponentsToHtml(viewToApiComponentsOf(rendered), {
    attachments: attachmentsMap(rendered.files),
    ...options,
  });
}

function viewToApiComponentsOf(rendered: ReturnType<typeof render>) {
  return (
    rendered.components as {
      toJSON(): APIMessageTopLevelComponent;
    }[]
  ).map((component) => component.toJSON());
}

/** Renders a JSX view to PNG bytes via headless Chrome. */
export async function renderViewToPng(
  element: JSXNode,
  options: ScreenshotOptions & HtmlRenderOptions = {},
): Promise<ScreenshotResult> {
  return screenshotHtml(renderViewToHtml(element, options), options);
}

// --- Arbitrary HTML ---------------------------------------------------------

export { screenshotHtml as renderHtmlToPng };
export type { ScreenshotOptions, ScreenshotResult };

// --- Comparisons ------------------------------------------------------------

export interface ViewComparisonInput extends HtmlRenderOptions {
  before: JSXNode;
  after: JSXNode;
  beforeLabel?: string;
  afterLabel?: string;
  /** Side-by-side (default) or stacked vertically. */
  layout?: "side-by-side" | "stacked";
  /** Width of each individual panel in CSS pixels (default: 520). */
  panelWidth?: number;
}

function comparisonPanels(input: ViewComparisonInput): ComparisonPanelInput[] {
  const shared: HtmlRenderOptions = {
    markdown: input.markdown,
    theme: input.theme,
  };
  return [
    {
      label: input.beforeLabel ?? "before",
      tone: "before" as const,
      body: renderComponentsToBody(viewToApiComponents(input.before), {
        ...shared,
        attachments: attachmentsMap(render(input.before).files),
      }),
    },
    {
      label: input.afterLabel ?? "after",
      tone: "after" as const,
      body: renderComponentsToBody(viewToApiComponents(input.after), {
        ...shared,
        attachments: attachmentsMap(render(input.after).files),
      }),
    },
  ];
}

/** Renders two JSX views into one labeled comparison document (pure HTML). */
export function renderViewComparisonToHtml(input: ViewComparisonInput): string {
  return renderPanelsToHtml(comparisonPanels(input), input);
}

/**
 * Renders two JSX views into a single labeled before/after PNG.
 * The viewport is sized to fit both panels automatically.
 */
export async function renderViewComparisonToPng(
  input: ViewComparisonInput & Omit<ScreenshotOptions, "width">,
): Promise<ScreenshotResult> {
  const html = renderViewComparisonToHtml(input);
  const panelWidth = input.panelWidth ?? 520;
  const width = input.layout === "stacked" ? panelWidth + 36 : panelWidth * 2 + 60;
  return screenshotHtml(html, { ...input, width });
}
