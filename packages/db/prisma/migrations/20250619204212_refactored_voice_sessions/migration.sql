-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSessionTotal" (
    "id" SERIAL NOT NULL,
    "isMuted" BOOLEAN NOT NULL,
    "isDeafened" BOOLEAN NOT NULL,
    "isStreaming" BOOLEAN NOT NULL,
    "isVideo" BOOLEAN NOT NULL,
    "secondsSpent" INTEGER NOT NULL,
    "voiceSessionId" INTEGER NOT NULL,

    CONSTRAINT "VoiceSessionTotal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSessionTotal" ADD CONSTRAINT "VoiceSessionTotal_voiceSessionId_fkey" FOREIGN KEY ("voiceSessionId") REFERENCES "VoiceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
