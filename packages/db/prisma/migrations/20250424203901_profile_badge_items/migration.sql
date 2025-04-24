-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE 'badge';

-- CreateTable
CREATE TABLE "DisplayedProfileBadge" (
    "userId" TEXT NOT NULL,
    "badgeId" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,

    CONSTRAINT "DisplayedProfileBadge_pkey" PRIMARY KEY ("userId","badgeId")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "image" BYTEA NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisplayedProfileBadge_userId_row_col_key" ON "DisplayedProfileBadge"("userId", "row", "col");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_itemId_key" ON "Badge"("itemId");

-- AddForeignKey
ALTER TABLE "DisplayedProfileBadge" ADD CONSTRAINT "DisplayedProfileBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayedProfileBadge" ADD CONSTRAINT "DisplayedProfileBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
