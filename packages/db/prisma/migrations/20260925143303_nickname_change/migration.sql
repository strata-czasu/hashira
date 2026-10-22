-- CreateTable
CREATE TABLE "NicknameChange" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nickname" TEXT NOT NULL,

    CONSTRAINT "NicknameChange_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NicknameChange" ADD CONSTRAINT "NicknameChange_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NicknameChange" ADD CONSTRAINT "NicknameChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
