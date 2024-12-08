import { sleep } from "bun";
import type { Duration } from "date-fns";
import { durationToMilliseconds } from "./duration";

type BatchProcessFunction<K, T> = (key: K, batch: T[]) => Promise<void>;

type BatchOptions = {
  interval: Duration;
  batchSize: number;
};

export class Batcher<K, const T> {
  protected items: Map<K, T[]> = new Map();
  protected interval: number;
  protected batchSize: number;
  protected processing: Map<K, boolean> = new Map();
  protected processBatch: BatchProcessFunction<K, T>;
  protected enabled = false;

  constructor(processBatch: BatchProcessFunction<K, T>, options: BatchOptions) {
    this.interval = durationToMilliseconds(options.interval);
    this.batchSize = options.batchSize;
    this.processBatch = processBatch;
  }

  push(key: K, item: T): void {
    const itemsForKey = this.items.get(key) ?? [];
    itemsForKey.push(item);
    this.items.set(key, itemsForKey);

    if (!this.processing.get(key)) {
      this.startProcessing(key);
    }
  }

  protected async startProcessing(key: K): Promise<void> {
    if (!this.enabled) return;
    this.processing.set(key, true);
    while (this.items.get(key)?.length) {
      await sleep(this.interval);
      const itemsForKey = this.items.get(key);
      if (!itemsForKey) return;
      // Pop the first `batchSize` items from the array
      const batch = itemsForKey.splice(0, this.batchSize);
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
