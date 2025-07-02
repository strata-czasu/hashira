-- CreateTable
CREATE TABLE "Giveaway" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "totalRewards" INTEGER NOT NULL,

    CONSTRAINT "Giveaway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveawayParticipant" (
    "id" SERIAL NOT NULL,
    "giveawayId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GiveawayParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveawayWinner" (
    "id" SERIAL NOT NULL,
    "giveawayId" INTEGER NOT NULL,
    "rewardId" INTEGER,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GiveawayWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveawayReward" (
    "id" SERIAL NOT NULL,
    "giveawayId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reward" TEXT NOT NULL,

    CONSTRAINT "GiveawayReward_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Giveaway" ADD CONSTRAINT "Giveaway_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveawayParticipant" ADD CONSTRAINT "GiveawayParticipant_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveawayParticipant" ADD CONSTRAINT "GiveawayParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveawayWinner" ADD CONSTRAINT "GiveawayWinner_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveawayWinner" ADD CONSTRAINT "GiveawayWinner_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "GiveawayReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveawayWinner" ADD CONSTRAINT "GiveawayWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveawayReward" ADD CONSTRAINT "GiveawayReward_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
