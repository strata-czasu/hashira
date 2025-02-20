import type { RedisClient } from "@hashira/db";
import type { BatcherBackend } from "./base";

export class RedisBackend<K, T> implements BatcherBackend<K, T> {
  #redis: RedisClient;
  #name: string;

  /**
   * @param redis The Redis client to use for the queue
   * @param name The name of the queue. Used as a prefix for keys in Redis.
   * Must be unique to avoid conflicts with other batchers
   */
  constructor(redis: RedisClient, name: string) {
    this.#redis = redis;
    this.#name = name;
  }

  // NOTE: Is this still needed?
  async initialize() {}

  // NOTE: Is this still needed?
  get initialized() {
    return this.#redis.isReady;
  }

  async push(key: K, item: T) {
    await this.#redis.RPUSH(this.getKey(key), JSON.stringify(item));
  }

  async popn(key: K, n: number) {
    const items = await this.#redis.LRANGE(this.getKey(key), 0, n - 1);
    this.#redis.LTRIM(this.getKey(key), n, -1);
    return items.map((item) => JSON.parse(item));
  }

  async size(key: K) {
    return await this.#redis.LLEN(this.getKey(key));
  }

  private getKey(key: K) {
    return `batcher:${this.#name}:${key}`;
  }
}
