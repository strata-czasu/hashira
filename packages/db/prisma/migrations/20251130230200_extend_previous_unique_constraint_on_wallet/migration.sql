/*
  Warnings:

  - A unique constraint covering the columns `[userId,name,guildId,currency]` on the table `wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "wallet_userId_name_guildId_currency_key" ON "public"."wallet"("userId", "name", "guildId", "currency");
