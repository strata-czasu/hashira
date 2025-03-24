-- CreateTable
CREATE TABLE "ProfileTitle" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProfileTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnedProfileTitle" (
    "titleId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnedProfileTitle_pkey" PRIMARY KEY ("titleId","userId")
);

-- CreateTable
CREATE TABLE "ProfileSettings" (
    "userId" TEXT NOT NULL,
    "titleId" INTEGER,

    CONSTRAINT "ProfileSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnedProfileTitle_titleId_userId_key" ON "OwnedProfileTitle"("titleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSettings_userId_key" ON "ProfileSettings"("userId");

-- AddForeignKey
ALTER TABLE "OwnedProfileTitle" ADD CONSTRAINT "OwnedProfileTitle_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "ProfileTitle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedProfileTitle" ADD CONSTRAINT "OwnedProfileTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSettings" ADD CONSTRAINT "ProfileSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSettings" ADD CONSTRAINT "ProfileSettings_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "ProfileTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
