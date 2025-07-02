-- CreateTable
CREATE TABLE "GiveawayWinner" (
    "id" SERIAL NOT NULL,
    "giveawayId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GiveawayWinner_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GiveawayWinner" ADD CONSTRAINT "GiveawayWinner_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveawayWinner" ADD CONSTRAINT "GiveawayWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
