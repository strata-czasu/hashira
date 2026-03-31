-- CreateTable
CREATE TABLE "Easter2026TeamConfig" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "statusChannelId" TEXT NOT NULL,
    "statusLastMessageId" TEXT,
    "captainUserId" TEXT,

    CONSTRAINT "Easter2026TeamConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Easter2026Config" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "eventStartDate" TIMESTAMP(3) NOT NULL,
    "eventEndDate" TIMESTAMP(3) NOT NULL,
    "dailyMessageCap" INTEGER NOT NULL DEFAULT 1000,
    "autoAssignNewMembers" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Easter2026Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Easter2026Stage" (
    "id" SERIAL NOT NULL,
    "teamConfigId" INTEGER NOT NULL,
    "neededPoints" INTEGER NOT NULL,
    "linkedImageUrl" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Easter2026Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Easter2026DisabledChannel" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "Easter2026DisabledChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Easter2026BonusChannel" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "channelId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Easter2026BonusChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Easter2026TeamConfig_teamId_key" ON "Easter2026TeamConfig"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Easter2026TeamConfig_roleId_key" ON "Easter2026TeamConfig"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Easter2026Config_guildId_key" ON "Easter2026Config"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Easter2026Stage_teamConfigId_neededPoints_key" ON "Easter2026Stage"("teamConfigId", "neededPoints");

-- CreateIndex
CREATE UNIQUE INDEX "Easter2026DisabledChannel_configId_channelId_key" ON "Easter2026DisabledChannel"("configId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "Easter2026BonusChannel_configId_date_key" ON "Easter2026BonusChannel"("configId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_guildId_key" ON "Team"("name", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- AddForeignKey
ALTER TABLE "Easter2026TeamConfig" ADD CONSTRAINT "Easter2026TeamConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Easter2026TeamConfig" ADD CONSTRAINT "Easter2026TeamConfig_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Easter2026Config" ADD CONSTRAINT "Easter2026Config_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Easter2026Stage" ADD CONSTRAINT "Easter2026Stage_teamConfigId_fkey" FOREIGN KEY ("teamConfigId") REFERENCES "Easter2026TeamConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Easter2026DisabledChannel" ADD CONSTRAINT "Easter2026DisabledChannel_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Easter2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Easter2026BonusChannel" ADD CONSTRAINT "Easter2026BonusChannel_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Easter2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
