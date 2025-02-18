import type { ExtendedPrismaClient, StickyMessage } from "@hashira/db";

export class StickyMessageCache {
  #cache = new Map<string, StickyMessage>();
  #prisma: ExtendedPrismaClient | null = null;

  async get(channelId: string): Promise<StickyMessage | null> {
    if (!this.#prisma) throw new Error("Prisma client not initialized");

    const cached = this.#cache.get(channelId);
    console.log("Cache?", cached);
    if (cached) return cached;

    console.log("Fetching sticky message from database");

    const stickyMessage = await this.#prisma.stickyMessage.findFirst({
      where: { channelId },
    });

    if (stickyMessage) this.#cache.set(channelId, stickyMessage);

    return stickyMessage;
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
