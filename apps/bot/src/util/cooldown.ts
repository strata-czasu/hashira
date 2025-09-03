import { type Duration, add as addDuration } from "date-fns";

export class Cooldown {
  readonly duration: Duration;
  #lastReset: Date;

  constructor(duration: Duration) {
    this.duration = duration;
    this.#lastReset = new Date(0);
  }

  ended(now: Date = new Date()): boolean {
    const endTime = addDuration(this.#lastReset, this.duration);
    if (now >= endTime) {
      this.#lastReset = now;
      return true;
    }
    return false;
  }
}
