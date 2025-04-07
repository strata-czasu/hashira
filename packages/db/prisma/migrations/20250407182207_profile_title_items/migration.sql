-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('item', 'profileTitle');

-- AlterTable
ALTER TABLE "item" ADD COLUMN     "type" "ItemType" NOT NULL DEFAULT 'item';

-- CreateTable
CREATE TABLE "ProfileSettings" (
    "userId" TEXT NOT NULL,
    "titleId" INTEGER,

    CONSTRAINT "ProfileSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSettings_userId_key" ON "ProfileSettings"("userId");

-- AddForeignKey
ALTER TABLE "ProfileSettings" ADD CONSTRAINT "ProfileSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSettings" ADD CONSTRAINT "ProfileSettings_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
