import type { ExtendedPrismaClient, StickyMessage } from "@hashira/db";

export class StickyMessageCache {
  #cache = new Map<string, StickyMessage | null>();
  #prisma: ExtendedPrismaClient | null = null;

  async get(channelId: string): Promise<StickyMessage | null> {
    if (!this.#prisma)
      throw new Error(
        "Prisma client not initialized. Please call start() with a valid ExtendedPrismaClient instance.",
      );

    // Check if we have a cached result (either a sticky message or null)
    if (this.#cache.has(channelId)) {
      return this.#cache.get(channelId) ?? null;
    }

    const stickyMessage = await this.#prisma.stickyMessage.findFirst({
      where: { channelId },
    });

    // Cache the result, even if it's null (channel has no sticky message)
    this.#cache.set(channelId, stickyMessage);

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
