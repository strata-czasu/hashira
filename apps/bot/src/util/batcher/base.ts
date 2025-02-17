export interface BatcherBackend<K, T> {
  initialize(): void | Promise<void>;
  get initialized(): boolean;

  push(key: K, item: T): void | Promise<void>;
  popn(key: K, n: number): T[] | Promise<T[]>;
  size(key: K): number | Promise<number>;
}
