/*
  Warnings:

  - You are about to drop the column `image` on the `Badge` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Badge" DROP COLUMN "image",
ADD COLUMN     "stars" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DisplayedProfileAchievement" (
    "userId" TEXT NOT NULL,
    "achievementId" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,

    CONSTRAINT "DisplayedProfileAchievement_pkey" PRIMARY KEY ("userId","achievementId")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisplayedProfileAchievement_userId_row_key" ON "DisplayedProfileAchievement"("userId", "row");

-- AddForeignKey
ALTER TABLE "DisplayedProfileAchievement" ADD CONSTRAINT "DisplayedProfileAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayedProfileAchievement" ADD CONSTRAINT "DisplayedProfileAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
