-- CreateTable
CREATE TABLE "Birthday2026PowerupConfig" (
    "configId" INTEGER NOT NULL,
    "maxInventory" INTEGER NOT NULL,
    "effectDurationSeconds" INTEGER NOT NULL,
    "turboDigestionSeconds" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026PowerupConfig_pkey" PRIMARY KEY ("configId")
);

-- CreateTable
CREATE TABLE "Birthday2026TeamPowerupState" (
    "teamConfigId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "inventory" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026TeamPowerupState_pkey" PRIMARY KEY ("teamConfigId")
);

-- CreateTable
CREATE TABLE "Birthday2026PowerupActivation" (
    "id" SERIAL NOT NULL,
    "teamConfigId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "captainUserId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(6) NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Birthday2026PowerupActivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamPowerupState_teamConfigId_configId_key" ON "Birthday2026TeamPowerupState"("teamConfigId", "configId");

-- CreateIndex
CREATE INDEX "Birthday2026PowerupActivation_teamConfigId_expiresAt_idx" ON "Birthday2026PowerupActivation"("teamConfigId", "expiresAt");

-- CreateIndex
CREATE INDEX "Birthday2026PowerupActivation_captainUserId_idx" ON "Birthday2026PowerupActivation"("captainUserId");

-- AddForeignKey
ALTER TABLE "Birthday2026PowerupConfig" ADD CONSTRAINT "Birthday2026PowerupConfig_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamPowerupState" ADD CONSTRAINT "Birthday2026TeamPowerupState_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026PowerupActivation" ADD CONSTRAINT "Birthday2026PowerupActivation_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026PowerupActivation" ADD CONSTRAINT "Birthday2026PowerupActivation_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026PowerupActivation" ADD CONSTRAINT "Birthday2026PowerupActivation_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
