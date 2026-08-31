import type { APIMessageTopLevelComponent, JSONEncodable } from "discord.js";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";

import { reconcile } from "./reconciler";
import type { JSXNode } from "./types";

export function render(element: JSXNode) {
  // reconcile() is idempotent - already resolved nodes pass through unchanged
  const children = reconcile(element);

  const components: JSONEncodable<APIMessageTopLevelComponent>[] = [];
  const files: AttachmentBuilder[] = [];

  for (const child of children) {
    if (child == null || child === false || child === true) continue;

    if (typeof child === "string" || typeof child === "number") {
      const text = new TextDisplayBuilder().setContent(String(child));
      components.push(text);
    } else if (child instanceof AttachmentBuilder) {
      files.push(child);
    } else if (
      child instanceof ActionRowBuilder ||
      child instanceof SectionBuilder ||
      child instanceof TextDisplayBuilder ||
      child instanceof MediaGalleryBuilder ||
      child instanceof FileBuilder ||
      child instanceof SeparatorBuilder ||
      child instanceof ContainerBuilder
    ) {
      components.push(child);
    } else {
      throw new Error(`Unsupported child type: ${typeof child}`);
    }
  }

  return {
    flags: "IsComponentsV2" as const,
    components,
    files,
  };
}
