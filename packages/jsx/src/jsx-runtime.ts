import { reconcile } from "./reconciler";
import type { ComponentFunction, JSXNode, JSXRecord, VNode } from "./types";
import { isHostComponent, vnodeMarker } from "./types";

const fragmentMarker = Symbol.for("fragment");

interface FragmentFunction {
  (props: { children?: JSXNode }): JSXNode;
  readonly [fragmentMarker]: true;
}

/**
 * Fragment is a pass-through component that returns its children.
 * Unlike host components, it doesn't produce a Builder - it just groups children.
 */
export const Fragment: FragmentFunction = Object.assign(
  function Fragment(props: { children?: JSXNode }): JSXNode {
    return props.children ?? null;
  },
  { [fragmentMarker]: true as const },
);

function isFragment(fn: unknown): fn is FragmentFunction {
  return typeof fn === "function" && Object.hasOwn(fn, fragmentMarker);
}

function flattenJSXNodes(nodes: JSXNode): JSXNode[] {
  if (nodes === null || nodes === undefined) return [];

  if (Array.isArray(nodes)) {
    return nodes.flatMap((n) => flattenJSXNodes(n));
  }

  return [nodes];
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

  // Fragment is a special case - it returns children directly without creating a VNode
  if (isFragment(tag)) {
    return flatChildren;
  }

  // Host components (Button, ActionRow, etc.) are called immediately
  // They produce discord.js Builders and don't need state management
  if (isHostComponent(tag)) {
    // Use reconcile to resolve any VNode children first
    const resolvedChildren = reconcile(flatChildren);
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

/**
 * JSX factory function for elements with multiple static children.
 *
 * Per the React 17+ JSX Transform RFC, `jsxs` is called by the compiler when an element
 * has more than one static child. The semantic guarantee is that `props.children` is
 * a statically-generated array (not user-provided).
 *
 * In this Discord JSX implementation, `jsxs` behaves identically to `jsx` since we don't
 * perform React-style key validation. Both functions flatten children and create VNodes
 * the same way. The distinction exists for spec compliance and potential future use.
 *
 * @param tag - Component function to call
 * @param props - Props including children (guaranteed to be a static array with >1 elements)
 * @param key - Optional key for list rendering
 * @returns A VNode for user components, or the result of calling host components
 */
export const jsxs = jsx;
