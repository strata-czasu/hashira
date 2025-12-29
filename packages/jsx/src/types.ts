import type {
  APIMediaGalleryItem,
  APISelectMenuOption,
  ComponentBuilder,
  JSONEncodable,
} from "discord.js";

export type JSXRecord = { children?: JSXNode };

export type ComponentFunction<
  P extends JSXRecord = JSXRecord,
  R extends JSXNode = JSXNode,
> = (props: P) => R;

export const vnodeMarker = Symbol.for("vnode");

export interface VNode<P extends JSXRecord, R extends JSXNode> {
  readonly [vnodeMarker]: true;
  readonly type: ComponentFunction<P, R>;
  readonly props: P;
  readonly key?: string | number;
}

export function isVNode(value: unknown): value is VNode<JSXRecord, JSXNode> {
  return (
    typeof value === "object" && value !== null && Object.hasOwn(value, vnodeMarker)
  );
}

export const hostMarker = Symbol.for("host-component");

export interface HostComponent<P extends JSXRecord, R extends JSXNode>
  extends ComponentFunction<P, R> {
  readonly [hostMarker]: true;
}

export function isHostComponent(fn: unknown): fn is HostComponent<JSXRecord, JSXNode> {
  return typeof fn === "function" && Object.hasOwn(fn, hostMarker);
}

export type JSXNode =
  | VNode<JSXRecord, JSXNode>
  | ComponentBuilder
  | JSONEncodable<APISelectMenuOption>
  | JSONEncodable<APIMediaGalleryItem>
  | string
  | number
  | boolean
  | null
  | undefined
  | JSXNode[];
