-- CreateEnum
CREATE TYPE "Birthday2026EncounterKind" AS ENUM ('quickGrab', 'teamThreshold');

-- AlterEnum
ALTER TYPE "Birthday2026PersonalTransactionSource" ADD VALUE 'encounter';

-- CreateTable
CREATE TABLE "Birthday2026EncounterConfig" (
    "configId" INTEGER NOT NULL,
    "channelId" TEXT NOT NULL,
    "responseWindowSeconds" INTEGER NOT NULL,
    "spawnIntervalSeconds" INTEGER NOT NULL,
    "individualReward" INTEGER NOT NULL,
    "winCap" INTEGER NOT NULL,
    "teamThreshold" INTEGER NOT NULL,
    "teamReward" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026EncounterConfig_pkey" PRIMARY KEY ("configId")
);

-- CreateTable
CREATE TABLE "Birthday2026Encounter" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "kind" "Birthday2026EncounterKind" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "startsAt" TIMESTAMP(6) NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "resolvedAt" TIMESTAMP(6),
    "cancelledAt" TIMESTAMP(6),

    CONSTRAINT "Birthday2026Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Birthday2026EncounterMessage" (
    "encounterId" INTEGER NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,

    CONSTRAINT "Birthday2026EncounterMessage_pkey" PRIMARY KEY ("encounterId")
);

-- CreateTable
CREATE TABLE "Birthday2026EncounterEntry" (
    "encounterId" INTEGER NOT NULL,
    "teamConfigId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Birthday2026EncounterEntry_pkey" PRIMARY KEY ("encounterId","userId")
);

-- CreateTable
CREATE TABLE "Birthday2026EncounterWinner" (
    "encounterId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "reward" INTEGER NOT NULL,
    "wonAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Birthday2026EncounterWinner_pkey" PRIMARY KEY ("encounterId")
);

-- CreateTable
CREATE TABLE "Birthday2026TeamEncounterCompletion" (
    "encounterId" INTEGER NOT NULL,
    "teamConfigId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "reward" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Birthday2026TeamEncounterCompletion_pkey" PRIMARY KEY ("encounterId","teamConfigId")
);

-- CreateIndex
CREATE INDEX "Birthday2026Encounter_configId_kind_expiresAt_idx" ON "Birthday2026Encounter"("configId", "kind", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026Encounter_configId_sourceKey_key" ON "Birthday2026Encounter"("configId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026EncounterMessage_channelId_messageId_key" ON "Birthday2026EncounterMessage"("channelId", "messageId");

-- CreateIndex
CREATE INDEX "Birthday2026EncounterEntry_teamConfigId_configId_idx" ON "Birthday2026EncounterEntry"("teamConfigId", "configId");

-- CreateIndex
CREATE INDEX "Birthday2026EncounterEntry_userId_idx" ON "Birthday2026EncounterEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026EncounterWinner_transactionId_key" ON "Birthday2026EncounterWinner"("transactionId");

-- CreateIndex
CREATE INDEX "Birthday2026EncounterWinner_configId_userId_idx" ON "Birthday2026EncounterWinner"("configId", "userId");

-- CreateIndex
CREATE INDEX "Birthday2026TeamEncounterCompletion_teamConfigId_configId_idx" ON "Birthday2026TeamEncounterCompletion"("teamConfigId", "configId");

-- AddForeignKey
ALTER TABLE "Birthday2026EncounterConfig" ADD CONSTRAINT "Birthday2026EncounterConfig_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026Encounter" ADD CONSTRAINT "Birthday2026Encounter_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026EncounterMessage" ADD CONSTRAINT "Birthday2026EncounterMessage_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Birthday2026Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026EncounterEntry" ADD CONSTRAINT "Birthday2026EncounterEntry_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Birthday2026Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026EncounterEntry" ADD CONSTRAINT "Birthday2026EncounterEntry_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026EncounterEntry" ADD CONSTRAINT "Birthday2026EncounterEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026EncounterWinner" ADD CONSTRAINT "Birthday2026EncounterWinner_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Birthday2026Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026EncounterWinner" ADD CONSTRAINT "Birthday2026EncounterWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026EncounterWinner" ADD CONSTRAINT "Birthday2026EncounterWinner_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamEncounterCompletion" ADD CONSTRAINT "Birthday2026TeamEncounterCompletion_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Birthday2026Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamEncounterCompletion" ADD CONSTRAINT "Birthday2026TeamEncounterCompletion_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;
