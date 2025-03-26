-- CreateTable
CREATE TABLE "ProfileBadge" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" BYTEA NOT NULL,

    CONSTRAINT "ProfileBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnedProfileBadge" (
    "badgeId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnedProfileBadge_pkey" PRIMARY KEY ("badgeId","userId")
);

-- CreateTable
CREATE TABLE "DisplayedProfileBadge" (
    "badgeId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "y" INTEGER NOT NULL,
    "x" INTEGER NOT NULL,

    CONSTRAINT "DisplayedProfileBadge_pkey" PRIMARY KEY ("badgeId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnedProfileBadge_badgeId_userId_key" ON "OwnedProfileBadge"("badgeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DisplayedProfileBadge_badgeId_userId_y_x_key" ON "DisplayedProfileBadge"("badgeId", "userId", "y", "x");

-- AddForeignKey
ALTER TABLE "OwnedProfileBadge" ADD CONSTRAINT "OwnedProfileBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "ProfileBadge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedProfileBadge" ADD CONSTRAINT "OwnedProfileBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayedProfileBadge" ADD CONSTRAINT "DisplayedProfileBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "ProfileBadge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayedProfileBadge" ADD CONSTRAINT "DisplayedProfileBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
