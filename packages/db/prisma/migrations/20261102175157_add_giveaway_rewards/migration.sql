-- CreateEnum
CREATE TYPE "giveaway_reward_type" AS ENUM ('currency', 'mute', 'item');

-- AlterTable
ALTER TABLE "GiveawayReward" ADD COLUMN     "currencyValue" INTEGER,
ADD COLUMN     "itemId" INTEGER,
ADD COLUMN     "muteDurationSeconds" INTEGER,
ADD COLUMN     "type" "giveaway_reward_type";

-- CreateTable
CREATE TABLE "GiveawayRewardDistribution" (
    "id" SERIAL NOT NULL,
    "rewardId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiveawayRewardDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiveawayRewardDistribution_userId_idx" ON "GiveawayRewardDistribution"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GiveawayRewardDistribution_rewardId_userId_key" ON "GiveawayRewardDistribution"("rewardId", "userId");

-- CreateIndex
CREATE INDEX "GiveawayReward_itemId_idx" ON "GiveawayReward"("itemId");

-- AddForeignKey
ALTER TABLE "GiveawayReward" ADD CONSTRAINT "GiveawayReward_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveawayRewardDistribution" ADD CONSTRAINT "GiveawayRewardDistribution_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "GiveawayReward"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GiveawayRewardDistribution" ADD CONSTRAINT "GiveawayRewardDistribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
