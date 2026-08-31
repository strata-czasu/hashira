import type { APIMessageTopLevelComponent, AttachmentBuilder } from "discord.js";

import { render } from "../render";
import type { JSXNode } from "../types";
import { type PreviewOptions, renderComparison, renderComponents, renderPage } from "./html";
import { type ScreenshotResult, screenshotHtml, type ScreenshotOptions } from "./screenshot";

export function viewToComponents(view: JSXNode): APIMessageTopLevelComponent[] {
  return render(view).components.map((component) => component.toJSON());
}

function attachmentToUrl(
  name: string,
  attachment: AttachmentBuilder["attachment"],
): string | undefined {
  if (typeof attachment === "string") {
    return /^https?:\/\//.test(attachment) ? attachment : undefined;
  }
  if (Buffer.isBuffer(attachment)) {
    return `data:${Bun.file(name).type};base64,${attachment.toString("base64")}`;
  }
  return undefined;
}

function withAttachments(files: AttachmentBuilder[], options: PreviewOptions): PreviewOptions {
  const attachments: Record<string, string> = {};
  for (const file of files) {
    if (!file.name) continue;
    const url = attachmentToUrl(file.name, file.attachment);
    if (url !== undefined) attachments[file.name] = url;
  }
  return { ...options, attachments: { ...attachments, ...options.attachments } };
}

export function viewToHtml(view: JSXNode, options: PreviewOptions = {}): string {
  const { components, files } = render(view);
  return renderPage(
    components.map((component) => component.toJSON()),
    withAttachments(files, options),
  );
}

export async function viewToPng(
  view: JSXNode,
  options: PreviewOptions & ScreenshotOptions = {},
): Promise<ScreenshotResult> {
  return screenshotHtml(viewToHtml(view, options), options);
}

export interface ViewComparison extends PreviewOptions {
  before: JSXNode;
  after: JSXNode;
  beforeLabel?: string;
  afterLabel?: string;
  stacked?: boolean;
}

function viewPanel(view: JSXNode, label: string, options: PreviewOptions) {
  const { components, files } = render(view);
  return {
    label,
    body: renderComponents(
      components.map((component) => component.toJSON()),
      withAttachments(files, options),
    ),
  };
}

export function compareViewsToHtml(input: ViewComparison): string {
  return renderComparison(
    viewPanel(input.before, input.beforeLabel ?? "before", input),
    viewPanel(input.after, input.afterLabel ?? "after", input),
    input,
  );
}

export async function compareViewsToPng(
  input: ViewComparison & ScreenshotOptions,
): Promise<ScreenshotResult> {
  return screenshotHtml(compareViewsToHtml(input), input);
}
