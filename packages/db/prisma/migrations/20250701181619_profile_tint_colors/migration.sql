-- CreateEnum
CREATE TYPE "TintColorType" AS ENUM ('default', 'fromItem', 'dynamic', 'custom');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ItemType" ADD VALUE 'staticTintColor';
ALTER TYPE "ItemType" ADD VALUE 'dynamicTintColorAccess';
ALTER TYPE "ItemType" ADD VALUE 'customTintColorAccess';

-- AlterTable
ALTER TABLE "ProfileSettings" ADD COLUMN     "customTintColor" INTEGER,
ADD COLUMN     "tintColorId" INTEGER,
ADD COLUMN     "tintColorType" "TintColorType" NOT NULL DEFAULT 'default';

-- CreateTable
CREATE TABLE "TintColor" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "color" INTEGER NOT NULL,

    CONSTRAINT "TintColor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TintColor_itemId_key" ON "TintColor"("itemId");

-- AddForeignKey
ALTER TABLE "ProfileSettings" ADD CONSTRAINT "ProfileSettings_tintColorId_fkey" FOREIGN KEY ("tintColorId") REFERENCES "TintColor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TintColor" ADD CONSTRAINT "TintColor_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
