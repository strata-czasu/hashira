import type { ExtendedPrismaClient, Prisma } from "@hashira/db";
import type { Guild } from "discord.js";
import { Batcher } from "../util/batcher";

export class VoiceActivityPoller {
  #batcher: Batcher<string, Prisma.UserVoiceActivityUncheckedCreateInput>;
  #prisma: ExtendedPrismaClient;
  #guild: Guild | null = null;

  constructor(prisma: ExtendedPrismaClient) {
    this.#prisma = prisma;
    this.#batcher = new Batcher(this.processBatch.bind(this), {
      interval: { minutes: 1 },
      batchSize: 100,
    });
    // TODO: workaround to push the branch
    this.#guild;
  }

  async processBatch(
    _: string,
    activities: Prisma.UserVoiceActivityUncheckedCreateInput[],
  ) {
    await this.#prisma.userVoiceActivity.createMany({
      data: activities,
    });
  }

  async start(guild: Guild) {
    this.#guild = guild;
    this.#batcher.start();
  }
}
