-- CreateTable
CREATE TABLE "LegacyExperience" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "importedExp" INTEGER NOT NULL,

    CONSTRAINT "LegacyExperience_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateTable
CREATE TABLE "LegacyLevelRole" (
    "guildId" TEXT NOT NULL,
    "minLevel" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "LegacyLevelRole_pkey" PRIMARY KEY ("guildId","minLevel")
);

-- CreateTable
CREATE TABLE "LegacyLevelIgnoredChannel" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "LegacyLevelIgnoredChannel_pkey" PRIMARY KEY ("guildId","channelId")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegacyLevelRole_guildId_roleId_key" ON "LegacyLevelRole"("guildId", "roleId");

-- AddForeignKey
ALTER TABLE "LegacyExperience" ADD CONSTRAINT "LegacyExperience_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyExperience" ADD CONSTRAINT "LegacyExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyLevelRole" ADD CONSTRAINT "LegacyLevelRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyLevelIgnoredChannel" ADD CONSTRAINT "LegacyLevelIgnoredChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
