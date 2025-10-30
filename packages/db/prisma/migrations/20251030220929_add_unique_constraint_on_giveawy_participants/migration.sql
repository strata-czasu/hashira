/*
  Warnings:

  - A unique constraint covering the columns `[giveawayId,userId]` on the table `GiveawayParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GiveawayParticipant_giveawayId_userId_key" ON "public"."GiveawayParticipant"("giveawayId", "userId");
