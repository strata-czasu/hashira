-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "totalMutedSeconds" INTEGER NOT NULL,
    "totalDeafenedSeconds" INTEGER NOT NULL,
    "totalStreamingSeconds" INTEGER NOT NULL,
    "totalVideoSeconds" INTEGER NOT NULL,
    "totalActiveStreamingSeconds" INTEGER NOT NULL,
    "totalActiveVideoSeconds" INTEGER NOT NULL,

    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
