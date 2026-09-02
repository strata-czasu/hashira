import type { APIMessageTopLevelComponent, AttachmentBuilder } from "discord.js";
import { readFileSync } from "node:fs";

import { render } from "../render";
import type { JSXNode } from "../types";
import { type PreviewOptions, renderComparison, renderComponents, renderPage } from "./html";
import { type ScreenshotResult, screenshotHtml, type ScreenshotOptions } from "./screenshot";

export function viewToComponents(view: JSXNode): APIMessageTopLevelComponent[] {
  return render(view).components.map((component) => component.toJSON());
}

function attachmentToUrl(name: string, attachment: AttachmentBuilder["attachment"]): string {
  const toDataUri = (data: Buffer) =>
    `data:${Bun.file(name).type};base64,${data.toString("base64")}`;
  if (typeof attachment === "string") {
    return /^https?:\/\//.test(attachment) ? attachment : toDataUri(readFileSync(attachment));
  }
  if (Buffer.isBuffer(attachment)) return toDataUri(attachment);
  throw new Error(
    `Attachment "${name}" must be a Buffer, file path, or http(s) URL to be previewed.`,
  );
}

function withAttachments(files: AttachmentBuilder[], options: PreviewOptions): PreviewOptions {
  const attachments: Record<string, string> = {};
  for (const file of files) {
    if (!file.name) continue;
    attachments[file.name] = attachmentToUrl(file.name, file.attachment);
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
