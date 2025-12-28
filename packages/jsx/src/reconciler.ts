import type { JSXNode } from "./types";
import { isVNode } from "./types";

export function reconcile(node: JSXNode): JSXNode[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (Array.isArray(node)) return node.flatMap(reconcile);

  if (isVNode(node)) return reconcile(node.type(node.props));

  return [node];
}
