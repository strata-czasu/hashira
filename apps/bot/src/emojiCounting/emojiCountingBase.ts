import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient, Prisma, RedisClient } from "@hashira/db";
import { Batcher, RedisBackend } from "../util/batcher";

type Input = Prisma.EmojiUsageCreateInput;
export class EmojiCountingQueue {
  #batcher: Batcher<string, Input> | null = null;
  #prisma: ExtendedPrismaClient | null = null;

  public push(channelId: string, messages: Input[]) {
    if (!this.#batcher) throw new Error("Batcher not initialized");
    for (const message of messages) {
      this.#batcher.push(channelId, message);
    }
  }

  private async processBatch(_channelId: string, messages: Input[]) {
    const prisma = this.#prisma;
    if (!prisma) throw new Error("Prisma client not initialized");

    // NOTE: This may be even better with a .createMany call
    //       instead of splitting everything into single inserts.
    await prisma.$transaction(
      messages.map((data) => prisma.emojiUsage.create({ data })),
    );
  }

  public start(prisma: ExtendedPrismaClient, redis: RedisClient) {
    this.#prisma = prisma;
    this.#batcher = new Batcher(this.processBatch.bind(this), {
      interval: { seconds: 15 },
      batchSize: 50,
      backend: new RedisBackend(redis, "emojiCountingQueue"),
    });
    this.#batcher.start();
  }
}

export const emojiCountingBase = new Hashira({ name: "emoji-counting-base" }).const(
  "emojiCountingQueue",
  new EmojiCountingQueue(),
);
