-- CreateTable
CREATE TABLE "ChannelRestriction" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "endsAt" TIMESTAMP(6),
    "deleteReason" TEXT,

    CONSTRAINT "ChannelRestriction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChannelRestriction" ADD CONSTRAINT "ChannelRestriction_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRestriction" ADD CONSTRAINT "ChannelRestriction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRestriction" ADD CONSTRAINT "ChannelRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
