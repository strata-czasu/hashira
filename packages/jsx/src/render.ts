import type { APIMessageTopLevelComponent, JSONEncodable } from "discord.js";
import { AttachmentBuilder, TextDisplayBuilder } from "discord.js";

import { reconcile } from "./reconciler";
import type { JSXNode } from "./types";

function isAttachment(child: object): child is AttachmentBuilder {
  return "attachment" in child;
}

function isComponent(child: object): child is JSONEncodable<APIMessageTopLevelComponent> {
  return "toJSON" in child && typeof child.toJSON === "function";
}

export function render(element: JSXNode) {
  // reconcile() is idempotent - already resolved nodes pass through unchanged
  const children = reconcile(element);

  const components: JSONEncodable<APIMessageTopLevelComponent>[] = [];
  const files: AttachmentBuilder[] = [];

  for (const child of children) {
    if (child == null || child === false || child === true) continue;

    if (typeof child === "string" || typeof child === "number") {
      components.push(new TextDisplayBuilder().setContent(String(child)));
    } else if (typeof child === "object" && isAttachment(child)) {
      files.push(child);
    } else if (typeof child === "object" && isComponent(child)) {
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
