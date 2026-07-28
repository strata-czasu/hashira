-- CreateTable
CREATE TABLE "Birthday2026TeamIdentity" (
    "teamConfigId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "tucznikUserId" TEXT NOT NULL,
    "captainUserId" TEXT NOT NULL,

    CONSTRAINT "Birthday2026TeamIdentity_pkey" PRIMARY KEY ("teamConfigId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamIdentity_teamConfigId_configId_key" ON "Birthday2026TeamIdentity"("teamConfigId", "configId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamIdentity_configId_tucznikUserId_key" ON "Birthday2026TeamIdentity"("configId", "tucznikUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamIdentity_configId_captainUserId_key" ON "Birthday2026TeamIdentity"("configId", "captainUserId");

-- CreateIndex
CREATE INDEX "Birthday2026TeamConfig_configId_idx" ON "Birthday2026TeamConfig"("configId");

-- AddForeignKey
ALTER TABLE "Birthday2026TeamIdentity" ADD CONSTRAINT "Birthday2026TeamIdentity_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamIdentity" ADD CONSTRAINT "Birthday2026TeamIdentity_tucznikUserId_fkey" FOREIGN KEY ("tucznikUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamIdentity" ADD CONSTRAINT "Birthday2026TeamIdentity_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
