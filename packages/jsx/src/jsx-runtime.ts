import type {
  ComponentFunction,
  HostComponent,
  JSXNode,
  JSXRecord,
  VNode,
} from "./types";
import { hostMarker, isHostComponent, isVNode, vnodeMarker } from "./types";

export const Fragment: HostComponent<JSXRecord, JSXNode> = Object.assign(
  function Fragment(props: { children?: JSXNode }): JSXNode {
    return props.children ?? null;
  },
  { [hostMarker]: true as const },
);

function flattenJSXNodes(nodes: JSXNode): JSXNode[] {
  if (nodes === null || nodes === undefined) return [];

  if (Array.isArray(nodes)) {
    return nodes.flatMap((n) => flattenJSXNodes(n));
  }

  return [nodes];
}

function resolveChildren(children: JSXNode[]): JSXNode[] {
  return children.map((child) => {
    const actualChild = isVNode(child) ? child.type(child.props) : child;

    if (isVNode(actualChild)) return resolveChildren([actualChild])[0];

    if (Array.isArray(actualChild)) return resolveChildren(actualChild);

    return actualChild;
  });
}

/**
 * JSX factory function for the automatic runtime.
 *
 * In the automatic runtime, children are passed via props.children, not as rest params.
 * This function creates VNodes for user components (lazy evaluation) and immediately
 * calls host components (Button, ActionRow, etc.).
 *
 * @param tag - Component function to call
 * @param props - Props including children
 * @param key - Optional key for list rendering
 * @returns A VNode for user components, or the result of calling host components
 */
export function jsx<P extends JSXRecord, R extends JSXNode>(
  tag: ComponentFunction<P, R>,
  props: P | null,
  key?: string | number,
): JSXNode {
  if (typeof tag !== "function") {
    throw new Error(
      `Unsupported tag type: ${typeof tag}. Did you mean to use a component?`,
    );
  }

  const flatChildren = flattenJSXNodes(props?.children).filter(
    (c) => c !== null && c !== undefined && c !== false && c !== true,
  );

  // Host components (Button, ActionRow, etc.) are called immediately
  // They produce discord.js Builders and don't need state management
  if (isHostComponent(tag)) {
    // For host components, we need to resolve any VNode children first
    const resolvedChildren = resolveChildren(flatChildren);
    const mergedProps = { ...props, children: resolvedChildren } as P;
    return tag(mergedProps);
  }

  const mergedProps = { ...props, children: flatChildren } as P;

  const vnode: VNode<JSXRecord, JSXNode> = {
    [vnodeMarker]: true as const,
    type: tag as unknown as ComponentFunction<JSXRecord, JSXNode>,
    props: mergedProps,
    ...(key ? { key } : {}),
  };

  return vnode;
}
