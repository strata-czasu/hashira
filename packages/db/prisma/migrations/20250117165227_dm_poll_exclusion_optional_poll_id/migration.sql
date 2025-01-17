-- DropForeignKey
ALTER TABLE "DmPollExclusion" DROP CONSTRAINT "DmPollExclusion_excludedByPollId_fkey";

-- AlterTable
ALTER TABLE "DmPollExclusion" ALTER COLUMN "excludedByPollId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "DmPollExclusion" ADD CONSTRAINT "DmPollExclusion_excludedByPollId_fkey" FOREIGN KEY ("excludedByPollId") REFERENCES "DmPoll"("id") ON DELETE SET NULL ON UPDATE CASCADE;
