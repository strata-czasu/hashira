/*
  Warnings:

  - You are about to drop the `VoiceSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VoiceSession" DROP CONSTRAINT "VoiceSession_guildId_fkey";

-- DropForeignKey
ALTER TABLE "VoiceSession" DROP CONSTRAINT "VoiceSession_userId_fkey";

-- DropTable
DROP TABLE "VoiceSession";
