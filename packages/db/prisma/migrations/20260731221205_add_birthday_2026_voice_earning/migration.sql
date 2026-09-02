-- AlterEnum
ALTER TYPE "Birthday2026PersonalTransactionSource" ADD VALUE 'voiceActivity';

-- CreateTable
CREATE TABLE "Birthday2026VoiceEarningConfig" (
    "configId" INTEGER NOT NULL,
    "unitSeconds" INTEGER NOT NULL,
    "dailyCap" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026VoiceEarningConfig_pkey" PRIMARY KEY ("configId")
);

-- CreateTable
CREATE TABLE "Birthday2026DailyVoiceEarning" (
    "configId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "eventDayIndex" INTEGER NOT NULL,
    "awardedUnits" INTEGER NOT NULL,

    CONSTRAINT "Birthday2026DailyVoiceEarning_pkey" PRIMARY KEY ("configId","userId","eventDayIndex")
);

-- CreateIndex
CREATE INDEX "Birthday2026DailyVoiceEarning_userId_idx" ON "Birthday2026DailyVoiceEarning"("userId");

-- AddForeignKey
ALTER TABLE "Birthday2026VoiceEarningConfig" ADD CONSTRAINT "Birthday2026VoiceEarningConfig_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026DailyVoiceEarning" ADD CONSTRAINT "Birthday2026DailyVoiceEarning_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026VoiceEarningConfig"("configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026DailyVoiceEarning" ADD CONSTRAINT "Birthday2026DailyVoiceEarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
