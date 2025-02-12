import env from "@hashira/env";
import { type RedisClientType, createClient } from "@redis/client";
import type { BatcherBackend } from "./base";

export class RedisBackend<K, T> implements BatcherBackend<K, T> {
  #redis: RedisClientType;
  #name: string;

  /**
   * @param name The name of the queue. Used as a prefix for keys in Redis.
   * Must be unique to avoid conflicts with other batchers
   */
  constructor(name: string) {
    this.#name = name;
    this.#redis = createClient({
      url: env.REDIS_URL,
    });
    this.#redis.on("error", (err) => console.error("Redis client error:", err));
  }

  async initialize() {
    await this.#redis.connect();
  }

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
    return `${this.#name}:${key}`;
  }
}
