export class LockManager {
  #locks = new Map<string, string>();

  acquire(key: string): boolean {
    if (this.#locks.has(key)) return false;
    this.#locks.set(key, key);
    return true;
  }

  release(key: string): boolean {
    return this.#locks.delete(key);
  }

  isLocked(key: string): boolean {
    return this.#locks.has(key);
  }

  /**
   * Run a function if a lock is free. This can be used as a keyed mutex.
   *
   * @param key List of keys to acquire before running the function
   * @param fn Function to run if all keys were free
   * @param lockInUseFn Function to run if any key was in use
   * @returns The result of the function that was run
   */
  async run<T, U>(key: string[], fn: () => T, lockInUseFn: () => U): Promise<T | U> {
    if (key.length === 0) throw new Error("Key must not be empty");

    if (!key.every((k) => this.acquire(k))) {
      return await lockInUseFn();
    }

    try {
      return await fn();
    } finally {
      key.every((k) => this.release(k));
    }
  }
}
