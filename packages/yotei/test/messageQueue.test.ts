// biome-ignore-all lint/style/noNonNullAssertion: test code

import { describe, expect, it } from "bun:test";
import type {
  MessageQueuePersistence,
  MessageQueueTask,
  MessageQueueTaskControls,
  TaskFindOptions,
} from "@hashira/yotei";
import { MessageQueue } from "@hashira/yotei";

type InMemoryTaskStatus = "pending" | "completed" | "failed" | "cancelled";

type InMemoryTask = {
  id: number;
  payload: { type: string; data: unknown };
  handleAfter: Date;
  createdAt: Date;
  identifier?: string;
  status: InMemoryTaskStatus;
};

class InMemoryPersistence implements MessageQueuePersistence<never> {
  #tasks: InMemoryTask[] = [];
  #nextId = 1;

  async createTask(
    payload: { type: string; data: unknown },
    handleAfter: Date,
    identifier?: string,
  ) {
    const now = new Date();

    this.#tasks.push({
      id: this.#nextId++,
      payload,
      handleAfter,
      createdAt: now,
      status: "pending",
      ...(identifier ? { identifier } : {}),
    });
  }

  async cancelTask(type: string, identifier: string, options?: TaskFindOptions<never>) {
    const task = this.#findPendingTask(type, identifier, options);
    if (!task) return false;

    task.status = "cancelled";

    return true;
  }

  async updateTaskDelay(
    type: string,
    identifier: string,
    delay: number | Date,
    options?: TaskFindOptions<never>,
  ) {
    const task = this.#findPendingTask(type, identifier, options);
    if (!task) return false;

    task.handleAfter =
      delay instanceof Date ? delay : new Date(task.createdAt.getTime() + delay * 1000);
    return true;
  }

  async withPendingTask(
    fn: (task: MessageQueueTask, controls: MessageQueueTaskControls) => Promise<void>,
  ) {
    const now = new Date();
    const task = this.#tasks
      .filter((entry) => entry.status === "pending" && entry.handleAfter <= now)
      .sort((a, b) => a.handleAfter.getTime() - b.handleAfter.getTime())[0];

    if (!task) return false;

    let settled = false;
    const mark = async (status: InMemoryTaskStatus) => {
      if (settled) return;
      settled = true;
      task.status = status;
    };

    const controls: MessageQueueTaskControls = {
      complete: async () => {
        await mark("completed");
      },
      fail: async () => {
        await mark("failed");
      },
    };

    try {
      await fn(
        {
          id: task.id,
          data: task.payload as MessageQueueTask["data"],
          createdAt: task.createdAt,
        },
        controls,
      );
    } finally {
      if (!settled) {
        await controls.fail();
      }
    }

    return true;
  }

  get tasks() {
    return this.#tasks;
  }

  #findPendingTask(type: string, identifier: string, options?: TaskFindOptions<never>) {
    const task = this.#tasks.find(
      (entry) =>
        entry.status === "pending" &&
        entry.identifier === identifier &&
        entry.payload.type === type,
    );

    if (!task && options?.throwIfNotFound) {
      throw new Error(`Task not found for identifier ${identifier} for type ${type}`);
    }

    return task || null;
  }
}

describe("MessageQueue", () => {
  it("schedules tasks without an explicit transaction", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("test", async () => {});

    await queue.push("test", { foo: "bar" }, undefined, "identifier");

    expect(persistence.tasks).toHaveLength(1);
    expect(persistence.tasks[0]).toMatchObject({
      payload: { type: "test", data: { foo: "bar" } },
      identifier: "identifier",
      status: "pending",
    });
  });

  it("allows scheduling tasks inside an existing transaction", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("test", async () => {});

    await queue.push("test", { value: 1 }, undefined, "tx-id");

    expect(persistence.tasks).toHaveLength(1);
    expect(persistence.tasks[0]).toMatchObject({
      payload: { type: "test", data: { value: 1 } },
      identifier: "tx-id",
      status: "pending",
    });
  });

  it("updates existing delays relative to creation time", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("delay", async () => {});
    const createdAt = new Date("2024-01-01T12:00:00.000Z");
    await queue.push("delay", null, undefined, "delay-id");

    const task = persistence.tasks[0]!;

    expect(task).toBeDefined();

    task.createdAt = createdAt;
    task.handleAfter = createdAt;

    await queue.updateDelay("delay", "delay-id", 3600);

    const updatedTask = persistence.tasks[0]!;

    expect(updatedTask).toBeDefined();

    expect(updatedTask.handleAfter.toISOString()).toBe("2024-01-01T13:00:00.000Z");
  });

  it("processes pending tasks and marks them as completed", async () => {
    let handledPayload: unknown = null;
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence, 10).addHandler(
      "process",
      async (_, data) => {
        handledPayload = data;
      },
    );

    await queue.push("process", { action: "go" });

    const originalSetInterval = setInterval;
    let intervalCallback: (() => Promise<void>) | null = null;

    globalThis.setInterval = ((cb: () => Promise<void>) => {
      intervalCallback = () => cb();
      return 0 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;

    try {
      await queue.consumeLoop({});

      // Manually trigger the interval callback
      await intervalCallback!();
      await Promise.resolve();

      expect(handledPayload).toEqual({ action: "go" });
      const task = persistence.tasks[0]!;
      expect(task).toBeDefined();
      expect(task.status).toBe("completed");
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it("schedules tasks with a delay in seconds", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("delayed", async () => {});

    const before = new Date();
    await queue.push("delayed", { data: "test" }, 60);
    const after = new Date();

    expect(persistence.tasks).toHaveLength(1);
    const task = persistence.tasks[0]!;
    expect(task).toBeDefined();

    const expectedTime = new Date(before.getTime() + 60000);
    const actualTime = task.handleAfter.getTime();

    expect(actualTime).toBeGreaterThanOrEqual(expectedTime.getTime());
    expect(actualTime).toBeLessThanOrEqual(
      expectedTime.getTime() + (after.getTime() - before.getTime()),
    );
  });

  it("schedules tasks with a specific Date", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("dated", async () => {});

    const targetDate = new Date("2025-12-31T23:59:59.000Z");
    await queue.push("dated", { event: "new-year" }, targetDate);

    expect(persistence.tasks).toHaveLength(1);
    const task = persistence.tasks[0]!;
    expect(task).toBeDefined();
    expect(task.handleAfter).toEqual(targetDate);
  });

  it("cancels pending tasks by type and identifier", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("cancel-me", async () => {});

    await queue.push("cancel-me", { value: 1 }, undefined, "task-1");
    await queue.push("cancel-me", { value: 2 }, undefined, "task-2");

    await queue.cancel("cancel-me", "task-1");

    expect(persistence.tasks).toHaveLength(2);
    expect(persistence.tasks[0]?.status).toBe("cancelled");
    expect(persistence.tasks[1]?.status).toBe("pending");
  });

  it("marks tasks as failed when handler throws an error", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence, 10).addHandler("failing", async () => {
      throw new Error("Handler failed");
    });

    await queue.push("failing", { data: "test" });

    const originalSetInterval = setInterval;
    let intervalCallback: (() => Promise<void>) | null = null;

    globalThis.setInterval = ((cb: () => Promise<void>) => {
      intervalCallback = () => cb();
      return 0 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;

    try {
      await queue.consumeLoop({});

      // Manually trigger the interval callback
      await intervalCallback!();
      await Promise.resolve();

      const task = persistence.tasks[0]!;
      expect(task).toBeDefined();
      expect(task.status).toBe("failed");
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it("marks tasks as failed when handler is not found", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence, 10);

    // @ts-expect-error: testing runtime behavior
    await queue.push("unknown-type", { data: "test" });

    const originalSetInterval = setInterval;
    let intervalCallback: (() => Promise<void>) | null = null;

    globalThis.setInterval = ((cb: () => Promise<void>) => {
      intervalCallback = () => cb();
      return 0 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;

    try {
      await queue.consumeLoop({});

      await intervalCallback!();
      await Promise.resolve();

      const task = persistence.tasks[0]!;
      expect(task).toBeDefined();
      expect(task.status).toBe("failed");
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it("passes args to handlers", async () => {
    let receivedProps: unknown = null;
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence, 10)
      .addArg<"userId", string>()
      .addArg<"guildId", string>()
      .addHandler("with-args", async (props) => {
        receivedProps = props;
      });

    await queue.push("with-args", { action: "test" });

    const originalSetInterval = setInterval;
    let intervalCallback: (() => Promise<void>) | null = null;

    globalThis.setInterval = ((cb: () => Promise<void>) => {
      intervalCallback = () => cb();
      return 0 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;

    try {
      await queue.consumeLoop({ userId: "user-123", guildId: "guild-456" });

      await intervalCallback!();
      await Promise.resolve();

      expect(receivedProps).toEqual({ userId: "user-123", guildId: "guild-456" });
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it("supports multiple handler types", async () => {
    const handled: string[] = [];
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence, 10)
      .addHandler("type-a", async () => {
        handled.push("a");
      })
      .addHandler("type-b", async () => {
        handled.push("b");
      })
      .addHandler("type-c", async () => {
        handled.push("c");
      });

    await queue.push("type-a", {});
    await queue.push("type-c", {});
    await queue.push("type-b", {});

    const originalSetInterval = setInterval;
    let intervalCallback: (() => Promise<void>) | null = null;

    globalThis.setInterval = ((cb: () => Promise<void>) => {
      intervalCallback = () => cb();
      return 0 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;

    try {
      await queue.consumeLoop({});

      for (let i = 0; i < 3; i++) {
        await intervalCallback!();
      }

      // Ensure all microtasks are processed
      await new Promise((r) => setImmediate(r));

      expect(handled).toContainValues(["a", "b", "c"]);
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  // TODO: this might not be the correct behavior, need to confirm
  it("processes tasks in order of which they were called", async () => {
    const processed: number[] = [];
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence, 10).addHandler(
      "ordered",
      async (_, data: { id: number }) => {
        processed.push(data.id);
      },
    );

    const now = new Date();
    await queue.push("ordered", { id: 3 }, new Date(now.getTime() + 3000));
    await queue.push("ordered", { id: 1 }, new Date(now.getTime() + 1000));
    await queue.push("ordered", { id: 2 }, new Date(now.getTime() + 2000));

    // Manually set all tasks to be ready
    for (const task of persistence.tasks) {
      task.handleAfter = new Date(now.getTime() - 1000);
    }

    const originalSetInterval = setInterval;
    let intervalCallback: (() => Promise<void>) | null = null;

    globalThis.setInterval = ((cb: () => Promise<void>) => {
      intervalCallback = () => cb();
      return 0 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;

    try {
      await queue.consumeLoop({});

      for (let i = 0; i < 3; i++) {
        await intervalCallback!();
      }

      // Ensure all microtasks are processed
      await new Promise((r) => setImmediate(r));

      expect(processed).toEqual([3, 1, 2]);
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it("does not process tasks scheduled in the future", async () => {
    let processed = false;
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence, 10).addHandler("future", async () => {
      processed = true;
    });

    const futureDate = new Date(Date.now() + 100000);
    await queue.push("future", {}, futureDate);

    const originalSetInterval = setInterval;
    let intervalCallback: (() => Promise<void>) | null = null;

    globalThis.setInterval = ((cb: () => Promise<void>) => {
      intervalCallback = () => cb();
      return 0 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;

    try {
      await queue.consumeLoop({});

      await intervalCallback!();
      await Promise.resolve();

      expect(processed).toBe(false);
      const task = persistence.tasks[0]!;
      expect(task).toBeDefined();
      expect(task.status).toBe("pending");
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it("throws an error if consumeLoop is called twice", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence);

    const originalSetInterval = setInterval;
    globalThis.setInterval = (() => 0) as unknown as typeof setInterval;

    try {
      await queue.consumeLoop({});
      expect(queue.consumeLoop({})).rejects.toThrow("MessageQueue is already running");
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it("updates delay with Date object", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("update", async () => {});

    await queue.push("update", {}, undefined, "update-id");

    const newDate = new Date("2025-06-15T10:30:00.000Z");
    await queue.updateDelay("update", "update-id", newDate);

    const task = persistence.tasks[0]!;
    expect(task).toBeDefined();
    expect(task.handleAfter).toEqual(newDate);
  });

  it("throws if type is not a string in push", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("test", async () => {});

    // @ts-expect-error - testing runtime validation
    expect(queue.push(123, {})).rejects.toThrow("Type must be a string");
  });

  it("throws if type is not a string in cancel", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("test", async () => {});

    // @ts-expect-error - testing runtime validation
    expect(queue.cancel(123, "id")).rejects.toThrow("Type must be a string");
  });

  it("throws if type is not a string in updateDelay", async () => {
    const persistence = new InMemoryPersistence();
    const queue = new MessageQueue(persistence).addHandler("test", async () => {});

    // @ts-expect-error - testing runtime validation
    expect(queue.updateDelay(123, "id", 60)).rejects.toThrow("Type must be a string");
  });
});
