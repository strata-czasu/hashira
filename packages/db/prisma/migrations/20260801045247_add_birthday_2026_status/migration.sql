-- CreateTable
CREATE TABLE "Birthday2026TeamPersona" (
    "teamConfigId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "tucznikUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fallbackEmoji" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(6) NOT NULL,
    "configuredByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Birthday2026TeamPersona_pkey" PRIMARY KEY ("teamConfigId")
);

-- CreateTable
CREATE TABLE "Birthday2026Milestone" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Birthday2026Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Birthday2026TeamArtwork" (
    "teamConfigId" INTEGER NOT NULL,
    "milestoneId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "Birthday2026TeamArtwork_pkey" PRIMARY KEY ("teamConfigId","milestoneId")
);

-- CreateTable
CREATE TABLE "Birthday2026TeamMilestone" (
    "teamConfigId" INTEGER NOT NULL,
    "milestoneId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Birthday2026TeamMilestone_pkey" PRIMARY KEY ("teamConfigId","milestoneId")
);

-- CreateTable
CREATE TABLE "Birthday2026StatusMessage" (
    "teamConfigId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Birthday2026StatusMessage_pkey" PRIMARY KEY ("teamConfigId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamPersona_teamConfigId_configId_key" ON "Birthday2026TeamPersona"("teamConfigId", "configId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026Milestone_id_configId_key" ON "Birthday2026Milestone"("id", "configId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026Milestone_configId_position_key" ON "Birthday2026Milestone"("configId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026Milestone_configId_threshold_key" ON "Birthday2026Milestone"("configId", "threshold");

-- CreateIndex
CREATE INDEX "Birthday2026TeamArtwork_milestoneId_configId_idx" ON "Birthday2026TeamArtwork"("milestoneId", "configId");

-- CreateIndex
CREATE INDEX "Birthday2026TeamMilestone_milestoneId_configId_idx" ON "Birthday2026TeamMilestone"("milestoneId", "configId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026StatusMessage_teamConfigId_configId_key" ON "Birthday2026StatusMessage"("teamConfigId", "configId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026StatusMessage_channelId_messageId_key" ON "Birthday2026StatusMessage"("channelId", "messageId");

-- AddForeignKey
ALTER TABLE "Birthday2026TeamPersona" ADD CONSTRAINT "Birthday2026TeamPersona_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamPersona" ADD CONSTRAINT "Birthday2026TeamPersona_tucznikUserId_fkey" FOREIGN KEY ("tucznikUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamPersona" ADD CONSTRAINT "Birthday2026TeamPersona_configuredByUserId_fkey" FOREIGN KEY ("configuredByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026Milestone" ADD CONSTRAINT "Birthday2026Milestone_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamArtwork" ADD CONSTRAINT "Birthday2026TeamArtwork_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamArtwork" ADD CONSTRAINT "Birthday2026TeamArtwork_milestoneId_configId_fkey" FOREIGN KEY ("milestoneId", "configId") REFERENCES "Birthday2026Milestone"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamMilestone" ADD CONSTRAINT "Birthday2026TeamMilestone_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamMilestone" ADD CONSTRAINT "Birthday2026TeamMilestone_milestoneId_configId_fkey" FOREIGN KEY ("milestoneId", "configId") REFERENCES "Birthday2026Milestone"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026StatusMessage" ADD CONSTRAINT "Birthday2026StatusMessage_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;
