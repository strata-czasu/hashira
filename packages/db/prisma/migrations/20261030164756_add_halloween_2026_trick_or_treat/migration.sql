-- CreateEnum
CREATE TYPE "Halloween2026TotItem" AS ENUM ('garlic', 'mirror', 'lollipop', 'mask', 'broom', 'dice');

-- CreateEnum
CREATE TYPE "Halloween2026TotKnockStatus" AS ENUM ('pending', 'answered', 'expired');

-- CreateEnum
CREATE TYPE "Halloween2026TotChoice" AS ENUM ('treat', 'trick');

-- CreateTable
CREATE TABLE "Halloween2026TotPlayer" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candies" INTEGER NOT NULL DEFAULT 0,
    "doorsClosed" BOOLEAN NOT NULL DEFAULT false,
    "lollipopArmed" BOOLEAN NOT NULL DEFAULT false,
    "maskArmed" BOOLEAN NOT NULL DEFAULT false,
    "lastKnockAt" TIMESTAMP(6),
    "muteImmuneUntil" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Halloween2026TotPlayer_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateTable
CREATE TABLE "Halloween2026TotInventory" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "item" "Halloween2026TotItem" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Halloween2026TotInventory_pkey" PRIMARY KEY ("guildId","userId","item")
);

-- CreateTable
CREATE TABLE "Halloween2026TotKnock" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "knockerId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "Halloween2026TotKnockStatus" NOT NULL DEFAULT 'pending',
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "choice" "Halloween2026TotChoice",
    "outcome" TEXT,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "dmChannelId" TEXT,
    "dmMessageId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "answeredAt" TIMESTAMP(6),

    CONSTRAINT "Halloween2026TotKnock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Halloween2026TotDailyLimit" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "mutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Halloween2026TotDailyLimit_pkey" PRIMARY KEY ("guildId","userId","day")
);

-- CreateIndex
CREATE INDEX "Halloween2026TotKnock_guildId_hostId_createdAt_idx" ON "Halloween2026TotKnock"("guildId", "hostId", "createdAt");

-- CreateIndex
CREATE INDEX "Halloween2026TotKnock_guildId_knockerId_hostId_createdAt_idx" ON "Halloween2026TotKnock"("guildId", "knockerId", "hostId", "createdAt");

-- AddForeignKey
ALTER TABLE "Halloween2026TotPlayer" ADD CONSTRAINT "Halloween2026TotPlayer_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotPlayer" ADD CONSTRAINT "Halloween2026TotPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotInventory" ADD CONSTRAINT "Halloween2026TotInventory_guildId_userId_fkey" FOREIGN KEY ("guildId", "userId") REFERENCES "Halloween2026TotPlayer"("guildId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotKnock" ADD CONSTRAINT "Halloween2026TotKnock_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotKnock" ADD CONSTRAINT "Halloween2026TotKnock_knockerId_fkey" FOREIGN KEY ("knockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotKnock" ADD CONSTRAINT "Halloween2026TotKnock_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotDailyLimit" ADD CONSTRAINT "Halloween2026TotDailyLimit_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotDailyLimit" ADD CONSTRAINT "Halloween2026TotDailyLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
