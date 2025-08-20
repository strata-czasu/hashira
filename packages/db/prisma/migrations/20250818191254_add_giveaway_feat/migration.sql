-- AlterTable
ALTER TABLE "Giveaway" ADD COLUMN     "authorId" TEXT NOT NULL DEFAULT '1015002135571734538',
ADD COLUMN     "roleBlacklist" TEXT[],
ADD COLUMN     "roleWhitelist" TEXT[];

-- AlterTable
ALTER TABLE "GiveawayParticipant" ADD COLUMN     "forcefullyRemoved" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Giveaway" ADD CONSTRAINT "Giveaway_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
