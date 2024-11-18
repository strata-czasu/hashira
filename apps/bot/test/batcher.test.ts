import { type Mock, beforeEach, describe, expect, mock, test } from "bun:test";
import { sleep } from "bun";
import { Batcher } from "../src/util/batcher";

describe("Batcher", () => {
  let batcher: Batcher<string, number>;
  let processBatchMock: Mock<(key: string, batch: number[]) => Promise<void>>;

  beforeEach(() => {
    processBatchMock = mock(() => sleep(20));
    batcher = new Batcher<string, number>(processBatchMock, {
      interval: 10,
      batchSize: 2,
    });
  });

  test("should not process items before start is called", () => {
    batcher.push("key1", 1);
    expect(processBatchMock).not.toHaveBeenCalled();
  });

  test("should process items after start is called", async () => {
    batcher.start();
    batcher.push("key1", 1);
    batcher.push("key1", 2);
    await sleep(15);
    expect(processBatchMock).toHaveBeenCalledWith("key1", [1, 2]);
  });

  test("should batch items according to batchSize", async () => {
    batcher.start();
    batcher.push("key1", 1);
    batcher.push("key1", 2);
    batcher.push("key1", 3);
    await sleep(15);
    expect(processBatchMock).toHaveBeenCalledWith("key1", [1, 2]);
    await sleep(35); // Wait for interval and processing time
    expect(processBatchMock).toHaveBeenCalledWith("key1", [3]);
  });

  test("should respect the interval between processing batches", async () => {
    batcher.start();
    batcher.push("key1", 1);
    const startTime = Date.now();
    await sleep(5);
    expect(processBatchMock).not.toHaveBeenCalled(); // Should not have processed yet
    await sleep(10);
    expect(processBatchMock).toHaveBeenCalled();
    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(10);
  });

  test("should handle multiple keys separately", async () => {
    batcher.start();
    batcher.push("key1", 1);
    batcher.push("key2", 2);
    await sleep(15);
    expect(processBatchMock).toHaveBeenCalledWith("key1", [1]);
    expect(processBatchMock).toHaveBeenCalledWith("key2", [2]);
  });

  test("should process a large batch size of 20 items", async () => {
    batcher = new Batcher<string, number>(processBatchMock, {
      interval: 10,
      batchSize: 20,
    });
    batcher.start();
    for (let i = 1; i <= 20; i++) {
      batcher.push("key1", i);
    }
    await sleep(15);
    expect(processBatchMock).toHaveBeenCalledWith(
      "key1",
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });
});
