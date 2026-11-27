import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "bun:test";
import { Effect } from "effect";

import { PrismaClient } from "@hashira/db";

import { LegacyLevel, make } from "../src/legacyLevel/legacyLevel";

const connectionString = process.env.DATABASE_TEST_URL;
const databaseTests = describe.skipIf(!connectionString);
const prisma = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : null;

const suffix = crypto.randomUUID();
const guildId = `legacy-level-guild-${suffix}`;
const userId = `legacy-level-user-${suffix}`;

afterAll(async () => {
  if (!prisma) return;
  await prisma.voiceSessionTotal.deleteMany({ where: { voiceSession: { guildId } } });
  await prisma.voiceSession.deleteMany({ where: { guildId } });
  await prisma.userTextActivity.deleteMany({ where: { guildId } });
  await prisma.legacyExperience.deleteMany({ where: { guildId } });
  await prisma.legacyLevelIgnoredChannel.deleteMany({ where: { guildId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.guild.deleteMany({ where: { id: guildId } });
  await prisma.$disconnect();
});

const message = (channelId: string, timestamp: string) => ({
  guildId,
  userId,
  channelId,
  messageId: `${channelId}-${timestamp}`,
  timestamp: new Date(timestamp),
});

const voiceSession = (joinedAt: string, secondsSpent: number, isMuted = false) => ({
  guildId,
  userId,
  channelId: "voice",
  joinedAt: new Date(joinedAt),
  leftAt: new Date(joinedAt),
  totals: {
    create: {
      isMuted,
      isDeafened: false,
      isStreaming: false,
      isVideo: false,
      isAlone: false,
      secondsSpent,
    },
  },
});

databaseTests("legacy level progress", () => {
  it("adds activity since the old bot stopped to the imported experience", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    await prisma.guild.create({ data: { id: guildId } });
    await prisma.user.create({ data: { id: userId } });
    await prisma.legacyExperience.create({ data: { guildId, userId, importedExp: 270 } });
    await prisma.legacyLevelIgnoredChannel.create({ data: { guildId, channelId: "spam" } });
    await prisma.userTextActivity.createMany({
      data: [
        message("general", "2026-08-04T01:59:59Z"), // already part of the imported experience
        message("general", "2026-08-04T02:00:00Z"),
        message("general", "2026-08-05T12:00:00Z"),
        message("spam", "2026-08-05T12:00:00Z"),
      ],
    });
    await prisma.voiceSession.create({ data: voiceSession("2026-08-05T12:00:00Z", 90) });
    await prisma.voiceSession.create({ data: voiceSession("2026-08-06T12:00:00Z", 90) });
    await prisma.voiceSession.create({ data: voiceSession("2026-08-06T13:00:00Z", 600, true) });

    const progress = await Effect.runPromise(
      LegacyLevel.use((service) => service.progress(guildId, [userId])).pipe(
        Effect.provideService(LegacyLevel, make(prisma)),
      ),
    );

    // 270 imported + 2 messages + 3 voice minutes is exactly level 5 (11 * 5^2)
    expect(progress.get(userId)).toEqual({
      exp: 275,
      level: 5,
      current: 0,
      target: 121,
      importedExp: 270,
    });
  });
});
