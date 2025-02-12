import { sleep } from "bun";
import type { Duration } from "date-fns";
import { durationToMilliseconds } from "../duration";
import type { BatcherBackend } from "./base";

type BatchProcessFunction<K, T> = (key: K, batch: T[]) => Promise<void>;

type BatchOptions<K, T> = {
  interval: Duration;
  batchSize: number;
  backend: BatcherBackend<K, T>;
};

export class Batcher<K, const T> {
  protected backend: BatcherBackend<K, T>;
  protected interval: number;
  protected batchSize: number;
  protected processing: Map<K, boolean> = new Map();
  protected processBatch: BatchProcessFunction<K, T>;
  protected enabled = false;

  constructor(processBatch: BatchProcessFunction<K, T>, options: BatchOptions<K, T>) {
    this.backend = options.backend;
    this.interval = durationToMilliseconds(options.interval);
    this.batchSize = options.batchSize;
    this.processBatch = processBatch;
  }

  async push(key: K, item: T): Promise<void> {
    if (!this.backend.initialized) {
      await this.backend.initialize();
    }

    await this.backend.push(key, item);

    if (!this.processing.get(key)) {
      this.startProcessing(key);
    }
  }

  protected async startProcessing(key: K): Promise<void> {
    if (!this.enabled) return;
    this.processing.set(key, true);

    while (await this.backend.size(key)) {
      await sleep(this.interval);

      const batch = await this.backend.popn(key, this.batchSize);
      if (!batch) return;

      try {
        await this.processBatch(key, batch);
      } catch (error) {
        console.error(`Error processing batch for key ${key}:`, error);
      }
    }

    this.processing.set(key, false);
  }

  public start(): void {
    this.enabled = true;
  }
}

export { InMemoryBackend } from "./inMemoryBackend";
