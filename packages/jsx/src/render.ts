import type { APIMessageTopLevelComponent, JSONEncodable } from "discord.js";
import { AttachmentBuilder, TextDisplayBuilder } from "discord.js";

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
      continue;
    }
    if (typeof child === "object" && "attachment" in child) {
      files.push(child as AttachmentBuilder);
    } else if (
      typeof child === "object" &&
      typeof (child as { toJSON?: unknown }).toJSON === "function"
    ) {
      components.push(child as JSONEncodable<APIMessageTopLevelComponent>);
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
