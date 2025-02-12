export interface BatcherBackend<K, T> {
  push(key: K, item: T): void;
  popn(key: K, n: number): T[];
  size(key: K): number;
}
