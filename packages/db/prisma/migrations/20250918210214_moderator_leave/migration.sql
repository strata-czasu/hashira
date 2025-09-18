-- AlterTable
ALTER TABLE "guildSettings" ADD COLUMN     "moderatorLeaveManagerId" TEXT,
ADD COLUMN     "moderatorLeaveRoleId" TEXT;

-- CreateTable
CREATE TABLE "ModeratorLeave" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),
    "startsAt" TIMESTAMP(6) NOT NULL,
    "endsAt" TIMESTAMP(6) NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addRole" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ModeratorLeave_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ModeratorLeave" ADD CONSTRAINT "ModeratorLeave_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeratorLeave" ADD CONSTRAINT "ModeratorLeave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
