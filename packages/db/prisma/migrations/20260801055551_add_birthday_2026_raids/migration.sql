-- CreateEnum
CREATE TYPE "Birthday2026RaidOutcome" AS ENUM ('success', 'noEligibleBatch');

-- AlterEnum
ALTER TYPE "Birthday2026TeamWalletTransactionSource" ADD VALUE 'raid';

-- CreateTable
CREATE TABLE "Birthday2026RaidConfig" (
    "configId" INTEGER NOT NULL,
    "chargesPerTeam" INTEGER NOT NULL,
    "maxSteal" INTEGER NOT NULL,
    "protectedFloor" INTEGER NOT NULL,
    "cooldownSeconds" INTEGER NOT NULL,
    "graceSeconds" INTEGER NOT NULL,
    "perUserLossCap" INTEGER NOT NULL,
    "repeatTargetCap" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026RaidConfig_pkey" PRIMARY KEY ("configId")
);

-- CreateTable
CREATE TABLE "Birthday2026RaidAttempt" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "attackerTeamConfigId" INTEGER NOT NULL,
    "targetTeamConfigId" INTEGER NOT NULL,
    "captainUserId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "outcome" "Birthday2026RaidOutcome" NOT NULL,
    "attemptedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Birthday2026RaidAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Birthday2026RaidTransfer" (
    "attemptId" INTEGER NOT NULL,
    "sourceWalletId" INTEGER NOT NULL,
    "destinationWalletId" INTEGER NOT NULL,
    "feedBatchId" INTEGER NOT NULL,
    "victimUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026RaidTransfer_pkey" PRIMARY KEY ("attemptId")
);

-- CreateIndex
CREATE INDEX "Birthday2026RaidAttempt_attackerTeamConfigId_attemptedAt_idx" ON "Birthday2026RaidAttempt"("attackerTeamConfigId", "attemptedAt");

-- CreateIndex
CREATE INDEX "Birthday2026RaidAttempt_targetTeamConfigId_attemptedAt_idx" ON "Birthday2026RaidAttempt"("targetTeamConfigId", "attemptedAt");

-- CreateIndex
CREATE INDEX "Birthday2026RaidAttempt_captainUserId_idx" ON "Birthday2026RaidAttempt"("captainUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026RaidAttempt_configId_sourceKey_key" ON "Birthday2026RaidAttempt"("configId", "sourceKey");

-- CreateIndex
CREATE INDEX "Birthday2026RaidTransfer_victimUserId_idx" ON "Birthday2026RaidTransfer"("victimUserId");

-- CreateIndex
CREATE INDEX "Birthday2026RaidTransfer_sourceWalletId_idx" ON "Birthday2026RaidTransfer"("sourceWalletId");

-- CreateIndex
CREATE INDEX "Birthday2026RaidTransfer_destinationWalletId_idx" ON "Birthday2026RaidTransfer"("destinationWalletId");

-- CreateIndex
CREATE INDEX "Birthday2026RaidTransfer_feedBatchId_idx" ON "Birthday2026RaidTransfer"("feedBatchId");

-- AddForeignKey
ALTER TABLE "Birthday2026RaidConfig" ADD CONSTRAINT "Birthday2026RaidConfig_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RaidAttempt" ADD CONSTRAINT "Birthday2026RaidAttempt_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RaidAttempt" ADD CONSTRAINT "Birthday2026RaidAttempt_attackerTeamConfigId_configId_fkey" FOREIGN KEY ("attackerTeamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RaidAttempt" ADD CONSTRAINT "Birthday2026RaidAttempt_targetTeamConfigId_configId_fkey" FOREIGN KEY ("targetTeamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RaidAttempt" ADD CONSTRAINT "Birthday2026RaidAttempt_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RaidTransfer" ADD CONSTRAINT "Birthday2026RaidTransfer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Birthday2026RaidAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RaidTransfer" ADD CONSTRAINT "Birthday2026RaidTransfer_sourceWalletId_fkey" FOREIGN KEY ("sourceWalletId") REFERENCES "Birthday2026TeamWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RaidTransfer" ADD CONSTRAINT "Birthday2026RaidTransfer_destinationWalletId_fkey" FOREIGN KEY ("destinationWalletId") REFERENCES "Birthday2026TeamWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RaidTransfer" ADD CONSTRAINT "Birthday2026RaidTransfer_feedBatchId_fkey" FOREIGN KEY ("feedBatchId") REFERENCES "Birthday2026FeedBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RaidTransfer" ADD CONSTRAINT "Birthday2026RaidTransfer_victimUserId_fkey" FOREIGN KEY ("victimUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
