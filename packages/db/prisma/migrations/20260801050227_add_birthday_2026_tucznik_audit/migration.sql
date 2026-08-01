-- CreateTable
CREATE TABLE "Birthday2026TucznikChange" (
    "id" SERIAL NOT NULL,
    "teamConfigId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "previousUserId" TEXT,
    "nextUserId" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Birthday2026TucznikChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Birthday2026TucznikChange_teamConfigId_changedAt_idx" ON "Birthday2026TucznikChange"("teamConfigId", "changedAt");

-- CreateIndex
CREATE INDEX "Birthday2026TucznikChange_previousUserId_idx" ON "Birthday2026TucznikChange"("previousUserId");

-- CreateIndex
CREATE INDEX "Birthday2026TucznikChange_nextUserId_idx" ON "Birthday2026TucznikChange"("nextUserId");

-- CreateIndex
CREATE INDEX "Birthday2026TucznikChange_changedByUserId_idx" ON "Birthday2026TucznikChange"("changedByUserId");

-- AddForeignKey
ALTER TABLE "Birthday2026TucznikChange" ADD CONSTRAINT "Birthday2026TucznikChange_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TucznikChange" ADD CONSTRAINT "Birthday2026TucznikChange_previousUserId_fkey" FOREIGN KEY ("previousUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TucznikChange" ADD CONSTRAINT "Birthday2026TucznikChange_nextUserId_fkey" FOREIGN KEY ("nextUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TucznikChange" ADD CONSTRAINT "Birthday2026TucznikChange_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
