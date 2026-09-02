-- AlterTable
ALTER TABLE "guildSettings" ADD COLUMN     "defaultCurrencyId" INTEGER;

-- AddForeignKey
ALTER TABLE "guildSettings" ADD CONSTRAINT "guildSettings_defaultCurrencyId_fkey" FOREIGN KEY ("defaultCurrencyId") REFERENCES "currency"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
