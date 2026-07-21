-- Manual migration based off 20260721220945_add_inventory_item_total.

-- Reject negative totals at the database level;
ALTER TABLE "inventoryItemTotal"
  ADD CONSTRAINT "inventoryItemTotal_quantity_nonnegative" CHECK ("quantity" >= 0);

-- Derive initial totals from existing copies.
INSERT INTO "inventoryItemTotal" ("userId", "itemId", "quantity")
SELECT "userId", "itemId", COUNT(*)::int
FROM "inventoryItem"
WHERE "deletedAt" IS NULL
GROUP BY "userId", "itemId";
