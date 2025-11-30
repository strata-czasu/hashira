/*
  Warnings:

  - Made the column `currencyId` on table `shopItem` required. This step will fail if there are existing NULL values in that column.

*/

-- Populate currencyId with the default currency (symbol = '$') for the item's guild
UPDATE "public"."shopItem" s
SET "currencyId" = (
  SELECT c.id 
  FROM "public"."currency" c 
  JOIN "public"."item" i ON i."guildId" = c."guildId"
  WHERE i.id = s."itemId" AND c.symbol = '$'
  LIMIT 1
);

-- DropForeignKey
ALTER TABLE "public"."shopItem" DROP CONSTRAINT "shopItem_currencyId_fkey";

-- AlterTable
ALTER TABLE "public"."shopItem" ALTER COLUMN "currencyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."shopItem" ADD CONSTRAINT "shopItem_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "public"."currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
