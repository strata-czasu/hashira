-- AlterTable
ALTER TABLE "guildSettings" ADD COLUMN     "birthdayChannelId" TEXT;

-- CreateTable
CREATE TABLE "birthday" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "year" INTEGER,

    CONSTRAINT "birthday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "birthday_userId_key" ON "birthday"("userId");

-- AddForeignKey
ALTER TABLE "birthday" ADD CONSTRAINT "birthday_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
