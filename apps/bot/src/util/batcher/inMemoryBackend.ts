import type { BatcherBackend } from "./base";

export class InMemoryBackend<K, T> implements BatcherBackend<K, T> {
  #items: Map<K, T[]> = new Map();

  push(key: K, item: T): void {
    const itemsForKey = this.#items.get(key) ?? [];
    itemsForKey.push(item);
    this.#items.set(key, itemsForKey);
  }

  popn(key: K, n: number): T[] {
    const itemsForKey = this.#items.get(key);
    if (!itemsForKey) return [];

    const batch = itemsForKey.splice(0, n);
    return batch;
  }

  size(key: K): number {
    const itemsForKey = this.#items.get(key);
    return itemsForKey?.length ?? 0;
  }
}
