/*
  Warnings:

  - You are about to drop the column `logChannelId` on the `guildSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "guildSettings" DROP COLUMN "logChannelId",
ADD COLUMN     "logSettingsId" INTEGER;

-- CreateTable
CREATE TABLE "LogSettings" (
    "id" SERIAL NOT NULL,
    "guildSettingsId" INTEGER NOT NULL,
    "messageLogChannelId" TEXT,
    "memberLogChannelId" TEXT,
    "banLogChannelId" TEXT,
    "profileLogChannelId" TEXT,

    CONSTRAINT "LogSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LogSettings_guildSettingsId_key" ON "LogSettings"("guildSettingsId");

-- AddForeignKey
ALTER TABLE "LogSettings" ADD CONSTRAINT "LogSettings_guildSettingsId_fkey" FOREIGN KEY ("guildSettingsId") REFERENCES "guildSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
