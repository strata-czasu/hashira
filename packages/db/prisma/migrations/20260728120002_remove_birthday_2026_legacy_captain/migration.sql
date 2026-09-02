/*
  Warnings:

  - You are about to drop the column `captainUserId` on the `Birthday2026TeamConfig` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Birthday2026TeamConfig" DROP CONSTRAINT "Birthday2026TeamConfig_captainUserId_fkey";

-- DropIndex
DROP INDEX "Birthday2026TeamConfig_configId_captainUserId_key";

-- AlterTable
ALTER TABLE "Birthday2026TeamConfig" DROP COLUMN "captainUserId";
