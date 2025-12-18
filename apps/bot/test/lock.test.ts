import { describe, expect, mock, test } from "bun:test";
import { LockManager } from "../src/util/lock";

describe("lockManager", () => {
  test("acquires lock", () => {
    const lockManager = new LockManager();
    expect(lockManager.acquire("key")).toBe(true);
    expect(lockManager.acquire("key")).toBe(false);
    expect(lockManager.isLocked("key")).toBe(true);
  });

  test("releases lock", () => {
    const lockManager = new LockManager();
    lockManager.acquire("key");
    expect(lockManager.release("key")).toBe(true);
    expect(lockManager.release("key")).toBe(false);
    expect(lockManager.isLocked("key")).toBe(false);
  });

  test("runs function if lock is free", async () => {
    const lockManager = new LockManager();
    const fn = mock();
    const lockInUseFn = mock();

    await lockManager.run(["key"], fn, lockInUseFn);
    expect(fn).toHaveBeenCalled();
    expect(lockInUseFn).not.toHaveBeenCalled();
  });

  test("runs lockInUseFn if lock is in use", async () => {
    const lockManager = new LockManager();
    lockManager.acquire("key");
    const fn = mock();
    const lockInUseFn = mock();

    await lockManager.run(["key"], fn, lockInUseFn);
    expect(fn).not.toHaveBeenCalled();
    expect(lockInUseFn).toHaveBeenCalled();
  });

  test("doesn't acquire other locks if one fails", async () => {
    const lockManager = new LockManager();
    lockManager.acquire("key2");
    const fn = mock();
    const lockInUseFn = mock();

    await lockManager.run(["key1", "key2"], fn, lockInUseFn);
    expect(fn).not.toHaveBeenCalled();
    expect(lockInUseFn).toHaveBeenCalled();
    expect(lockManager.isLocked("key1")).toBe(false);
    expect(lockManager.isLocked("key2")).toBe(true);
  });

  test("releases lock after running function", async () => {
    const lockManager = new LockManager();
    await lockManager.run(["key"], mock(), mock());
    expect(lockManager.isLocked("key")).toBe(false);
  });

  test("doesn't release lock after running lockInUseFn", async () => {
    const lockManager = new LockManager();
    lockManager.acquire("key");
    await lockManager.run(["key"], mock(), mock());
    expect(lockManager.isLocked("key")).toBe(true);
  });

  test("releases lock if function throws", async () => {
    const lockManager = new LockManager();
    const fn = () => {
      throw new Error("error");
    };
    try {
      await lockManager.run(["key"], fn, mock());
    } catch {}
    expect(lockManager.isLocked("key")).toBe(false);
  });

  test("doesn't release lock if lockInUseFn throws", async () => {
    const lockManager = new LockManager();
    lockManager.acquire("key");
    const lockInUseFn = () => {
      throw new Error("error");
    };
    try {
      await lockManager.run(["key"], mock(), lockInUseFn);
    } catch {}
    expect(lockManager.isLocked("key")).toBe(true);
  });

  test("prevents concurrent runs of function", async () => {
    const lockManager = new LockManager();
    const fn = mock();
    const lockInUseFn = mock();

    await Promise.all([
      lockManager.run(["key"], fn, lockInUseFn),
      lockManager.run(["key"], fn, lockInUseFn),
      lockManager.run(["key"], fn, lockInUseFn),
    ]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(lockInUseFn).toHaveBeenCalledTimes(2);
  });
});
