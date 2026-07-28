-- AlterEnum
ALTER TYPE "Birthday2026PersonalTransactionSource" ADD VALUE 'textActivity';

-- CreateTable
CREATE TABLE "Birthday2026TextEarningConfig" (
    "configId" INTEGER NOT NULL,
    "windowSeconds" INTEGER NOT NULL,
    "dailyCap" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026TextEarningConfig_pkey" PRIMARY KEY ("configId")
);

-- CreateTable
CREATE TABLE "Birthday2026DisabledTextChannel" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "Birthday2026DisabledTextChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Birthday2026DailyTextEarning" (
    "configId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "eventDayIndex" INTEGER NOT NULL,
    "awardedWindows" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026DailyTextEarning_pkey" PRIMARY KEY ("configId","userId","eventDayIndex")
);

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026DisabledTextChannel_configId_channelId_key" ON "Birthday2026DisabledTextChannel"("configId", "channelId");

-- CreateIndex
CREATE INDEX "Birthday2026DailyTextEarning_userId_idx" ON "Birthday2026DailyTextEarning"("userId");

-- AddForeignKey
ALTER TABLE "Birthday2026TextEarningConfig" ADD CONSTRAINT "Birthday2026TextEarningConfig_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026DisabledTextChannel" ADD CONSTRAINT "Birthday2026DisabledTextChannel_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026TextEarningConfig"("configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026DailyTextEarning" ADD CONSTRAINT "Birthday2026DailyTextEarning_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026TextEarningConfig"("configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026DailyTextEarning" ADD CONSTRAINT "Birthday2026DailyTextEarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
