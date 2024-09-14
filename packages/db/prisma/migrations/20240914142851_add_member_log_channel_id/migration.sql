/*
  Warnings:

  - You are about to drop the column `logChannelId` on the `guildSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "guildSettings" DROP COLUMN "logChannelId",
ADD COLUMN     "memberLogChannelId" TEXT,
ADD COLUMN     "messageLogChannelId" TEXT;
