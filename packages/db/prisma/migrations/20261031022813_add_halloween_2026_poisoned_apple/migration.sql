-- AlterTable
ALTER TABLE "Halloween2026TotKnock" ADD COLUMN     "appleId" INTEGER;

-- CreateTable
CREATE TABLE "Halloween2026TotApple" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "previousHolderId" TEXT,
    "channelId" TEXT NOT NULL,
    "passes" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(6) NOT NULL,
    "fuseEndsAt" TIMESTAMP(6) NOT NULL,
    "bittenAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Halloween2026TotApple_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Halloween2026TotApple_guildId_bittenAt_fuseEndsAt_idx" ON "Halloween2026TotApple"("guildId", "bittenAt", "fuseEndsAt");

-- CreateIndex
CREATE INDEX "Halloween2026TotApple_guildId_holderId_bittenAt_idx" ON "Halloween2026TotApple"("guildId", "holderId", "bittenAt");

-- CreateIndex
CREATE INDEX "Halloween2026TotKnock_appleId_status_idx" ON "Halloween2026TotKnock"("appleId", "status");

-- AddForeignKey
ALTER TABLE "Halloween2026TotKnock" ADD CONSTRAINT "Halloween2026TotKnock_appleId_fkey" FOREIGN KEY ("appleId") REFERENCES "Halloween2026TotApple"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotApple" ADD CONSTRAINT "Halloween2026TotApple_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotApple" ADD CONSTRAINT "Halloween2026TotApple_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halloween2026TotApple" ADD CONSTRAINT "Halloween2026TotApple_previousHolderId_fkey" FOREIGN KEY ("previousHolderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
