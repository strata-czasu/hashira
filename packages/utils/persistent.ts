const registryKey = Symbol.for("hashira.persistent");

type PersistentGlobal = typeof globalThis & { [registryKey]?: Map<string, unknown> };

// NOTE: `bun --hot` re-evaluates every module on reload but keeps `globalThis`, so the
// registry lives there. Without hot reload each factory simply runs once.
const registry = ((globalThis as PersistentGlobal)[registryKey] ??= new Map());

/**
 * Create a value once per process and reuse it across hot reloads.
 *
 * Use this for long-lived resources (connections, clients, timers, in-memory locks) that
 * must not be recreated when the module graph is re-evaluated.
 *
 * Values created before a reload come from the previous module graph, so `instanceof`
 * checks against their classes will fail in reloaded code.
 */
export const persistent = <T>(key: string, factory: () => T): T => {
  if (!registry.has(key)) registry.set(key, factory());
  return registry.get(key) as T;
};
