-- CreateIndex
CREATE INDEX "VoiceSession_guildId_userId_joinedAt_idx" ON "VoiceSession"("guildId", "userId", "joinedAt");

-- CreateIndex
CREATE INDEX "VoiceSessionTotal_voiceSessionId_idx" ON "VoiceSessionTotal"("voiceSessionId");

-- CreateIndex
CREATE INDEX "userTextActivity_guildId_userId_timestamp_channelId_idx" ON "userTextActivity"("guildId", "userId", "timestamp", "channelId");
