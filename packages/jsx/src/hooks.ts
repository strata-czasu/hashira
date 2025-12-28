import { getCurrentContext } from "./reconciler";

/**
 * A setter function for updating state.
 * Can accept either a new value directly or a function that receives
 * the previous value and returns the new value.
 */
export type StateSetter<T> = (valueOrUpdater: T | ((prev: T) => T)) => void;

/**
 * React-like useState hook for managing component state.
 *
 * Unlike React, this implementation uses a single shared state store
 * per Root instance. The hook index determines which slot in the store
 * is used for this particular useState call.
 *
 * @param initialValue - The initial state value (used only on first render)
 * @returns A tuple of [currentValue, setterFunction]
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, setCount] = useState(0);
 *   return (
 *     <ActionRow>
 *       <Button
 *         label={`Count: ${count}`}
 *         customId="increment"
 *         style={ButtonStyle.Primary}
 *       />
 *     </ActionRow>
 *   );
 * }
 * ```
 */
export function useState<T>(initialValue: T): [T, StateSetter<T>] {
  const ctx = getCurrentContext();
  const hookIndex = ctx.hookIndex;

  // Initialize state on first render
  if (ctx.hooks.length <= hookIndex) {
    ctx.hooks.push(initialValue);
  }

  const currentValue = ctx.hooks[hookIndex] as T;

  // Create a stable setter that captures the hook index
  const setValue: StateSetter<T> = (valueOrUpdater) => {
    const prevValue = ctx.hooks[hookIndex] as T;
    const newValue =
      typeof valueOrUpdater === "function"
        ? (valueOrUpdater as (prev: T) => T)(prevValue)
        : valueOrUpdater;

    // Only update and trigger re-render if value actually changed
    if (!Object.is(prevValue, newValue)) {
      ctx.hooks[hookIndex] = newValue;
      ctx.scheduleUpdate();
    }
  };

  // Increment hook index for next hook call
  ctx.hookIndex++;

  return [currentValue, setValue];
}

/**
 * useRef hook for storing mutable values that don't trigger re-renders.
 *
 * @param initialValue - The initial value for the ref
 * @returns An object with a `current` property
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const renderCount = useRef(0);
 *   renderCount.current++;
 *   // renderCount.current persists across renders but doesn't cause re-renders
 * }
 * ```
 */
export function useRef<T>(initialValue: T): { current: T } {
  const ctx = getCurrentContext();
  const hookIndex = ctx.hookIndex;

  // Initialize ref on first render
  if (ctx.hooks.length <= hookIndex) {
    ctx.hooks.push({ current: initialValue });
  }

  const ref = ctx.hooks[hookIndex] as { current: T };
  ctx.hookIndex++;

  return ref;
}

/**
 * useMemo hook for memoizing expensive computations.
 *
 * @param factory - Function that computes the memoized value
 * @param deps - Dependencies array - value is recomputed when deps change
 * @returns The memoized value
 *
 * @example
 * ```tsx
 * function ExpensiveComponent({ items }) {
 *   const sortedItems = useMemo(() => {
 *     return [...items].sort((a, b) => a.name.localeCompare(b.name));
 *   }, [items]);
 * }
 * ```
 */
export function useMemo<T>(factory: () => T, deps: unknown[]): T {
  const ctx = getCurrentContext();
  const hookIndex = ctx.hookIndex;

  type MemoState = { value: T; deps: unknown[] };

  // Check if we have a cached value
  if (ctx.hooks.length > hookIndex) {
    const cached = ctx.hooks[hookIndex] as MemoState;
    const depsChanged =
      cached.deps.length !== deps.length ||
      cached.deps.some((dep, i) => !Object.is(dep, deps[i]));

    if (!depsChanged) {
      ctx.hookIndex++;
      return cached.value;
    }
  }

  // Compute new value
  const value = factory();
  ctx.hooks[hookIndex] = { value, deps };
  ctx.hookIndex++;

  return value;
}

/**
 * useCallback hook for memoizing callback functions.
 *
 * @param callback - The callback function to memoize
 * @param deps - Dependencies array - callback is recreated when deps change
 * @returns The memoized callback
 */
export function useCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: unknown[],
): T {
  return useMemo(() => callback, deps);
}
