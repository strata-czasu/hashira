import { ComponentBuilder } from "discord.js";
import { type HostComponent, hostMarker, type JSXNode, type JSXRecord } from "../types";

export function markAsHost<P extends JSXRecord, R extends JSXNode>(
  fn: (props: P) => R,
) {
  return Object.assign(fn, { [hostMarker]: true }) as HostComponent<P, R>;
}

export function flattenChildren(children: JSXNode): ComponentBuilder[] {
  if (Array.isArray(children)) {
    return children.flatMap(flattenChildren);
  }

  if (children instanceof ComponentBuilder) {
    return [children];
  }
  return [];
}

export function getTextContent(children: JSXNode, separator = ""): string | null {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (!Array.isArray(children)) return null;

  const parts = children
    .map((child) => getTextContent(child, separator))
    .filter((s): s is string => s !== null);

  if (parts.length === 0) return null;

  return parts.join(separator);
}
