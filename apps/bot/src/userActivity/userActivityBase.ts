import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient, Prisma, RedisClient } from "@hashira/db";
import { StickyMessageCache } from "../stickyMessage/stickyMessageCache";
import { Batcher, RedisBackend } from "../util/batcher";

type Input = Prisma.UserTextActivityCreateInput;
export class UserTextActivityQueue {
  #batcher: Batcher<string, Input> | null = null;
  #prisma: ExtendedPrismaClient | null = null;

  public push(channelId: string, message: Input) {
    if (!this.#batcher) throw new Error("Batcher not initialized");
    this.#batcher.push(channelId, message);
  }

  private async processBatch(_channelId: string, messages: Input[]) {
    const prisma = this.#prisma;
    if (!prisma) throw new Error("Prisma client not initialized");

    // NOTE: This may be even better with a .createMany call
    //       instead of splitting everything into single inserts.
    await prisma.$transaction(
      messages.map((m) => prisma.userTextActivity.create({ data: m })),
    );
  }

  public start(prisma: ExtendedPrismaClient, redis: RedisClient) {
    this.#prisma = prisma;
    this.#batcher = new Batcher(this.processBatch.bind(this), {
      interval: { seconds: 15 },
      batchSize: 50,
      backend: new RedisBackend(redis, "userTextActivityQueue"),
    });
    this.#batcher.start();
  }
}

export const userActivityBase = new Hashira({ name: "user-activity-base" })
  .const("userTextActivityQueue", new UserTextActivityQueue())
  .const("stickyMessageCache", new StickyMessageCache());
