-- CreateTable
CREATE TABLE "inventoryItemTotal" (
    "userId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventoryItemTotal_pkey" PRIMARY KEY ("userId","itemId")
);

-- AddForeignKey
ALTER TABLE "inventoryItemTotal" ADD CONSTRAINT "inventoryItemTotal_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventoryItemTotal" ADD CONSTRAINT "inventoryItemTotal_itemId_item_id_fk" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
