/*
  Warnings:

  - Added the required column `isAlone` to the `VoiceSessionTotal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VoiceSessionTotal" ADD COLUMN     "isAlone" BOOLEAN NOT NULL;
