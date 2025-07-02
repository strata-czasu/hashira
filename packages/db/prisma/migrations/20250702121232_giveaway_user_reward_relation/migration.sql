/*
  Warnings:

  - Added the required column `rewardId` to the `GiveawayWinner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GiveawayWinner" ADD COLUMN     "rewardId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "GiveawayWinner" ADD CONSTRAINT "GiveawayWinner_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "GiveawayReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
