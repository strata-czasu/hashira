-- CreateEnum
CREATE TYPE "Birthday2026IndividualResultCategory" AS ENUM ('topContributor');

-- AlterEnum
ALTER TYPE "Birthday2026PersonalTransactionSource" ADD VALUE 'settlement';

-- CreateTable
CREATE TABLE "Birthday2026Settlement" (
    "configId" INTEGER NOT NULL,
    "cutoffAt" TIMESTAMP(6) NOT NULL,
    "settledAt" TIMESTAMP(6) NOT NULL,
    "settledByUserId" TEXT NOT NULL,
    "digestedPendingPasza" INTEGER NOT NULL,
    "discardedPersonalPasza" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026Settlement_pkey" PRIMARY KEY ("configId")
);

-- CreateTable
CREATE TABLE "Birthday2026SettlementTeam" (
    "configId" INTEGER NOT NULL,
    "teamConfigId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "permanentWeight" INTEGER NOT NULL,
    "contributedPasza" INTEGER NOT NULL,
    "contributorCount" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026SettlementTeam_pkey" PRIMARY KEY ("configId","teamConfigId")
);

-- CreateTable
CREATE TABLE "Birthday2026IndividualResult" (
    "configId" INTEGER NOT NULL,
    "category" "Birthday2026IndividualResultCategory" NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026IndividualResult_pkey" PRIMARY KEY ("configId","category","userId")
);

-- CreateIndex
CREATE INDEX "Birthday2026Settlement_settledByUserId_idx" ON "Birthday2026Settlement"("settledByUserId");

-- CreateIndex
CREATE INDEX "Birthday2026SettlementTeam_teamConfigId_configId_idx" ON "Birthday2026SettlementTeam"("teamConfigId", "configId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026SettlementTeam_configId_rank_key" ON "Birthday2026SettlementTeam"("configId", "rank");

-- CreateIndex
CREATE INDEX "Birthday2026IndividualResult_userId_idx" ON "Birthday2026IndividualResult"("userId");

-- AddForeignKey
ALTER TABLE "Birthday2026Settlement" ADD CONSTRAINT "Birthday2026Settlement_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026Settlement" ADD CONSTRAINT "Birthday2026Settlement_settledByUserId_fkey" FOREIGN KEY ("settledByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026SettlementTeam" ADD CONSTRAINT "Birthday2026SettlementTeam_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Settlement"("configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026SettlementTeam" ADD CONSTRAINT "Birthday2026SettlementTeam_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026IndividualResult" ADD CONSTRAINT "Birthday2026IndividualResult_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Settlement"("configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026IndividualResult" ADD CONSTRAINT "Birthday2026IndividualResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
