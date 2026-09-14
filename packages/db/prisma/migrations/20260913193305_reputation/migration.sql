-- CreateTable
CREATE TABLE "DailyRepRedeem" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyRepRedeem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DailyRepRedeem" ADD CONSTRAINT "DailyRepRedeem_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRepRedeem" ADD CONSTRAINT "DailyRepRedeem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
