import type { ExtendedPrismaClient, StickyMessage } from "@hashira/db";

export class StickyMessageCache {
  #cache = new Map<string, StickyMessage>();
  #prisma: ExtendedPrismaClient | null = null;

  async get(channelId: string): Promise<StickyMessage | null> {
    if (!this.#prisma)
      throw new Error(
        "Prisma client not initialized. Please call start() with a valid ExtendedPrismaClient instance.",
      );

    const cached = this.#cache.get(channelId);
    if (cached) return cached;

    const stickyMessage = await this.#prisma.stickyMessage.findFirst({
      where: { channelId },
    });

    if (stickyMessage) this.#cache.set(channelId, stickyMessage);

    return stickyMessage;
  }

  async update(channelId: string, lastMessageId: string) {
    if (!this.#prisma)
      throw new Error(
        "Prisma client not initialized. Please call start() with a valid ExtendedPrismaClient instance.",
      );

    const stickyMessage = await this.#prisma.stickyMessage.update({
      where: { channelId },
      data: { lastMessageId },
    });

    this.#cache.set(channelId, stickyMessage);
  }

  invalidate(channelId: string) {
    this.#cache.delete(channelId);
  }

  isCached(channelId: string) {
    return this.#cache.has(channelId);
  }

  start(prisma: ExtendedPrismaClient) {
    this.#prisma = prisma;
  }
}
