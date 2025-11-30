-- AlterTable
ALTER TABLE "public"."shopItem" ADD COLUMN     "currencyId" INTEGER,
ADD COLUMN     "globalStock" INTEGER,
ADD COLUMN     "soldCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "userPurchaseLimit" INTEGER;

-- CreateTable
CREATE TABLE "public"."ShopItemPurchase" (
    "id" SERIAL NOT NULL,
    "shopItemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopItemPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopItemPurchase_shopItemId_userId_key" ON "public"."ShopItemPurchase"("shopItemId", "userId");

-- AddForeignKey
ALTER TABLE "public"."shopItem" ADD CONSTRAINT "shopItem_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "public"."currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopItemPurchase" ADD CONSTRAINT "ShopItemPurchase_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "public"."shopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopItemPurchase" ADD CONSTRAINT "ShopItemPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
