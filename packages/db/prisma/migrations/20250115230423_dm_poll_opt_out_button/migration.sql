-- CreateEnum
CREATE TYPE "button_style" AS ENUM ('primary', 'secondary', 'success', 'danger', 'link', 'premium');

-- AlterTable
ALTER TABLE "DmPollOption" ADD COLUMN     "isOptOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "style" "button_style" NOT NULL DEFAULT 'secondary';

-- CreateTable
CREATE TABLE "DmPollExclusion" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excludedByPollId" INTEGER NOT NULL,

    CONSTRAINT "DmPollExclusion_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "DmPollExclusion_userId_key" ON "DmPollExclusion"("userId");

-- AddForeignKey
ALTER TABLE "DmPollExclusion" ADD CONSTRAINT "DmPollExclusion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmPollExclusion" ADD CONSTRAINT "DmPollExclusion_excludedByPollId_fkey" FOREIGN KEY ("excludedByPollId") REFERENCES "DmPoll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
