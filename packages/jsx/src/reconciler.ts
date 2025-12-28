import type { JSXNode } from "./types";
import { isVNode } from "./types";

export interface RenderContext {
  hooks: unknown[];
  hookIndex: number;
  scheduleUpdate: () => void;
}

let currentContext: RenderContext | null = null;

export function getCurrentContext(): RenderContext {
  if (!currentContext) {
    throw new Error(
      "Hooks can only be called inside a component during rendering. " +
        "Make sure you're using hooks inside a component function passed to createRoot().",
    );
  }
  return currentContext;
}

export function setCurrentContext(ctx: RenderContext | null): void {
  currentContext = ctx;
}

export function reconcile(node: JSXNode): JSXNode[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (Array.isArray(node)) return node.flatMap(reconcile);

  if (isVNode(node)) return reconcile(node.type(node.props));

  return [node];
}
