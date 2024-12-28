-- CreateTable
CREATE TABLE "StickyMessage" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "lastMessageId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL,

    CONSTRAINT "StickyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StickyMessage_channelId_key" ON "StickyMessage"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "StickyMessage_lastMessageId_key" ON "StickyMessage"("lastMessageId");

-- AddForeignKey
ALTER TABLE "StickyMessage" ADD CONSTRAINT "StickyMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
