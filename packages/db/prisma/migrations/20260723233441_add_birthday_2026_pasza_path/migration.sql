-- CreateEnum
CREATE TYPE "Birthday2026PersonalTransactionSource" AS ENUM ('staffGrant', 'feed');

-- CreateEnum
CREATE TYPE "Birthday2026TeamWalletTransactionSource" AS ENUM ('feed', 'digestion');

-- CreateTable
CREATE TABLE "Birthday2026EconomyConfig" (
    "configId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "digestionDelaySeconds" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026EconomyConfig_pkey" PRIMARY KEY ("configId")
);

-- CreateTable
CREATE TABLE "Birthday2026TeamWallet" (
    "id" SERIAL NOT NULL,
    "teamConfigId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "permanentWeight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Birthday2026TeamWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Birthday2026TeamWalletTransaction" (
    "id" SERIAL NOT NULL,
    "walletId" INTEGER NOT NULL,
    "feedBatchId" INTEGER NOT NULL,
    "personalTransactionId" INTEGER,
    "source" "Birthday2026TeamWalletTransactionSource" NOT NULL,
    "entryType" "entry_type" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Birthday2026TeamWalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Birthday2026FeedBatch" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "walletId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "personalTransactionId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "remainingAmount" INTEGER NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "digestAt" TIMESTAMP(6) NOT NULL,
    "digestedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Birthday2026FeedBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Birthday2026PersonalTransaction" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "source" "Birthday2026PersonalTransactionSource" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Birthday2026PersonalTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026EconomyConfig_currencyId_key" ON "Birthday2026EconomyConfig"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamWallet_teamConfigId_key" ON "Birthday2026TeamWallet"("teamConfigId");

-- CreateIndex
CREATE INDEX "Birthday2026TeamWallet_currencyId_idx" ON "Birthday2026TeamWallet"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamWalletTransaction_personalTransactionId_key" ON "Birthday2026TeamWalletTransaction"("personalTransactionId");

-- CreateIndex
CREATE INDEX "Birthday2026TeamWalletTransaction_feedBatchId_idx" ON "Birthday2026TeamWalletTransaction"("feedBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamWalletTransaction_walletId_source_sourceKey_key" ON "Birthday2026TeamWalletTransaction"("walletId", "source", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026FeedBatch_personalTransactionId_key" ON "Birthday2026FeedBatch"("personalTransactionId");

-- CreateIndex
CREATE INDEX "Birthday2026FeedBatch_walletId_digestedAt_digestAt_idx" ON "Birthday2026FeedBatch"("walletId", "digestedAt", "digestAt");

-- CreateIndex
CREATE INDEX "Birthday2026FeedBatch_userId_idx" ON "Birthday2026FeedBatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026FeedBatch_configId_sourceKey_key" ON "Birthday2026FeedBatch"("configId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026PersonalTransaction_transactionId_key" ON "Birthday2026PersonalTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "Birthday2026PersonalTransaction_userId_idx" ON "Birthday2026PersonalTransaction"("userId");

-- CreateIndex
CREATE INDEX "Birthday2026PersonalTransaction_createdByUserId_idx" ON "Birthday2026PersonalTransaction"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026PersonalTransaction_configId_source_sourceKey_key" ON "Birthday2026PersonalTransaction"("configId", "source", "sourceKey");

-- AddForeignKey
ALTER TABLE "Birthday2026EconomyConfig" ADD CONSTRAINT "Birthday2026EconomyConfig_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026EconomyConfig" ADD CONSTRAINT "Birthday2026EconomyConfig_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamWallet" ADD CONSTRAINT "Birthday2026TeamWallet_teamConfigId_fkey" FOREIGN KEY ("teamConfigId") REFERENCES "Birthday2026TeamConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamWallet" ADD CONSTRAINT "Birthday2026TeamWallet_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamWalletTransaction" ADD CONSTRAINT "Birthday2026TeamWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Birthday2026TeamWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamWalletTransaction" ADD CONSTRAINT "Birthday2026TeamWalletTransaction_feedBatchId_fkey" FOREIGN KEY ("feedBatchId") REFERENCES "Birthday2026FeedBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamWalletTransaction" ADD CONSTRAINT "Birthday2026TeamWalletTransaction_personalTransactionId_fkey" FOREIGN KEY ("personalTransactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026FeedBatch" ADD CONSTRAINT "Birthday2026FeedBatch_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026FeedBatch" ADD CONSTRAINT "Birthday2026FeedBatch_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Birthday2026TeamWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026FeedBatch" ADD CONSTRAINT "Birthday2026FeedBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026FeedBatch" ADD CONSTRAINT "Birthday2026FeedBatch_personalTransactionId_fkey" FOREIGN KEY ("personalTransactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026PersonalTransaction" ADD CONSTRAINT "Birthday2026PersonalTransaction_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026PersonalTransaction" ADD CONSTRAINT "Birthday2026PersonalTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026PersonalTransaction" ADD CONSTRAINT "Birthday2026PersonalTransaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026PersonalTransaction" ADD CONSTRAINT "Birthday2026PersonalTransaction_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
