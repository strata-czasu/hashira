import type {
  ActionRowData,
  APIAttachment,
  APIMessageTopLevelComponent,
  Attachment,
  AttachmentPayload,
  BufferResolvable,
  JSONEncodable,
  MessageActionRowComponentBuilder,
  MessageActionRowComponentData,
  MessageEditOptions,
  TopLevelComponentData,
} from "discord.js";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { reconcile } from "./reconciler";
import type { JSXNode } from "./types";
import { isVNode } from "./types";

// Extracted from BaseMessageOptions["components"] to be mutable
type Components = (
  | JSONEncodable<APIMessageTopLevelComponent>
  | TopLevelComponentData
  | ActionRowData<MessageActionRowComponentData | MessageActionRowComponentBuilder>
  | APIMessageTopLevelComponent
)[];

// Extracted from BaseMessageOptions["files"] to be mutable
type Files = (
  | BufferResolvable
  | JSONEncodable<APIAttachment>
  | Attachment
  | AttachmentBuilder
  | AttachmentPayload
)[];

export function render(element: JSXNode): MessageEditOptions {
  const resolved = Array.isArray(element) ? element : [element];

  const needsReconciliation = resolved.some(
    (child) => isVNode(child) || (Array.isArray(child) && child.some(isVNode)),
  );

  const children = needsReconciliation
    ? reconcile(element)
    : (resolved as unknown[]).flat(Infinity);

  const components: Components = [];
  const files: Files = [];

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
    flags: MessageFlags.IsComponentsV2,
    components,
    files,
  };
}
