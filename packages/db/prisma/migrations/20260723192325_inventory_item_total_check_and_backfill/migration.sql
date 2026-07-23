-- Manual migration based off 20260723192324_add_inventory_item_total.

-- Reject negative totals at the database level.
ALTER TABLE "InventoryItemTotal"
  ADD CONSTRAINT "InventoryItemTotal_quantity_nonnegative" CHECK ("quantity" >= 0);

-- Derive initial totals from existing copies.
INSERT INTO "InventoryItemTotal" ("userId", "itemId", "quantity")
SELECT "userId", "itemId", COUNT(*)::int
FROM "inventoryItem"
WHERE "deletedAt" IS NULL
GROUP BY "userId", "itemId";
