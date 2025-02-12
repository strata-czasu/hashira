import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient, Prisma } from "@hashira/db";
import { Batcher, InMemoryBackend } from "../util/batcher";

export class UserTextActivityQueue {
  #batcher: Batcher<string, Prisma.UserTextActivityCreateInput>;
  #prisma: ExtendedPrismaClient | null = null;

  constructor() {
    this.#batcher = new Batcher(this.processBatch.bind(this), {
      interval: { seconds: 15 },
      batchSize: 50,
      backend: new InMemoryBackend(),
    });
  }

  public push(channelId: string, message: Prisma.UserTextActivityCreateInput) {
    this.#batcher.push(channelId, message);
  }

  private async processBatch(
    _channelId: string,
    messages: Prisma.UserTextActivityCreateInput[],
  ) {
    const prisma = this.#prisma;
    if (!prisma) throw new Error("Prisma client not initialized");

    // NOTE: This may be even better with a .createMany call
    //       instead of splitting everything into single inserts.
    await prisma.$transaction(
      messages.map((m) => prisma.userTextActivity.create({ data: m })),
    );
  }

  public start(prisma: ExtendedPrismaClient) {
    this.#prisma = prisma;
    this.#batcher.start();
  }
}

export const userActivityBase = new Hashira({ name: "userActivityBase" }).const(
  "userTextActivityQueue",
  new UserTextActivityQueue(),
);
