-- CreateTable
CREATE TABLE "Birthday2026Registration" (
    "configId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Birthday2026Registration_pkey" PRIMARY KEY ("configId","userId")
);

-- CreateTable
CREATE TABLE "Birthday2026RosterFinalization" (
    "configId" INTEGER NOT NULL,
    "analysisStartAt" TIMESTAMP(6) NOT NULL,
    "analysisEndAt" TIMESTAMP(6) NOT NULL,
    "finalizedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Birthday2026RosterFinalization_pkey" PRIMARY KEY ("configId")
);

-- CreateIndex
CREATE INDEX "Birthday2026Registration_userId_idx" ON "Birthday2026Registration"("userId");

-- AddForeignKey
ALTER TABLE "Birthday2026Registration" ADD CONSTRAINT "Birthday2026Registration_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026Registration" ADD CONSTRAINT "Birthday2026Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026RosterFinalization" ADD CONSTRAINT "Birthday2026RosterFinalization_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
