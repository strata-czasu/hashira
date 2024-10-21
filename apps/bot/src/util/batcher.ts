import type { Duration } from "date-fns";
import { durationToMilliseconds } from "./duration";

type BatchProcessFunction<K, T> = (key: K, batch: T[]) => Promise<void>;

interface BatcherOptions {
  interval: Duration;
  batchSize: number;
}

export class Batcher<K, const T> {
  private items: Map<K, T[]> = new Map();
  private interval: number;
  private batchSize: number;
  private processing: Map<K, boolean> = new Map();
  private processBatch: BatchProcessFunction<K, T>;
  private enabled = false;

  constructor(processBatch: BatchProcessFunction<K, T>, options: BatcherOptions) {
    this.interval = durationToMilliseconds(options.interval);
    this.batchSize = options.batchSize;
    this.processBatch = processBatch;
  }

  push(key: K, item: T): void {
    if (!this.items.has(key)) {
      this.items.set(key, []);
    }
    const itemsForKey = this.items.get(key);
    if (itemsForKey) {
      itemsForKey.push(item);
    }
    if (!this.processing.get(key)) {
      this.startProcessing(key);
    }
  }

  private async startProcessing(key: K): Promise<void> {
    if (!this.enabled) return;
    this.processing.set(key, true);
    while (this.items.get(key)?.length) {
      const itemsForKey = this.items.get(key);
      if (!itemsForKey) return;
      // Pop the first `batchSize` items from the array
      const batch = itemsForKey.splice(0, this.batchSize);
      try {
        await this.processBatch(key, batch);
      } catch (error) {
        console.error(`Error processing batch for key ${key}:`, error);
      }
      await new Promise((resolve) => setTimeout(resolve, this.interval));
    }
    this.processing.set(key, false);
  }

  public start(): void {
    this.enabled = true;
  }
}
