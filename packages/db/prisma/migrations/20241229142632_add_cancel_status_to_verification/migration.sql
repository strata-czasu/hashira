/*
  Warnings:

  - Made the column `status` on table `verification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "verification_status" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "verification" ADD COLUMN     "cancelledAt" TIMESTAMP(6),
ALTER COLUMN "status" SET NOT NULL;
