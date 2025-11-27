-- Add new columns to shopItem (currencyId starts as nullable)
ALTER TABLE "public"."shopItem" 
ADD COLUMN     "currencyId" INTEGER,
ADD COLUMN     "globalStock" INTEGER,
ADD COLUMN     "soldCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "userPurchaseLimit" INTEGER;

-- Update existing shopItem rows: set currencyId to the guild's default currency (symbol='$')
-- We join through item to get guildId, then find the currency with symbol '$'
UPDATE "public"."shopItem" s
SET "currencyId" = (
  SELECT c.id 
  FROM "public"."currency" c 
  JOIN "public"."item" i ON i."guildId" = c."guildId"
  WHERE i.id = s."itemId" AND c.symbol = '$'
  LIMIT 1
);

-- Now make currencyId required
ALTER TABLE "public"."shopItem" ALTER COLUMN "currencyId" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."shopItemPurchase" (
    "id" SERIAL NOT NULL,
    "shopItemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopItemPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopItemPurchase_shopItemId_userId_key" ON "public"."shopItemPurchase"("shopItemId", "userId");

-- AddForeignKey
ALTER TABLE "public"."shopItem" ADD CONSTRAINT "shopItem_currencyId_currency_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."shopItemPurchase" ADD CONSTRAINT "shopItemPurchase_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "public"."shopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shopItemPurchase" ADD CONSTRAINT "shopItemPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
