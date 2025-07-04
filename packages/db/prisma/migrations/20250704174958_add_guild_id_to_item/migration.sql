/*
Generated steps:
- AlterTable with new "guildId" not-null column
- AddForeignKey

Manual changes:
- Removed not-null from first AlterTable
- Force-insert a guild with id '211261411119202305' if it doesn't exist
- Set the guild to all existing items
- Restore not-null to "guildId"
*/

-- AlterTable
ALTER TABLE "item" ADD COLUMN     "guildId" TEXT;

-- Insert
INSERT INTO "guild" ("id") VALUES ('211261411119202305') ON CONFLICT DO NOTHING;

-- Update
UPDATE "item" SET "guildId" = '211261411119202305' WHERE "guildId" IS NULL;

-- AlterTable
ALTER TABLE "item" ALTER COLUMN "guildId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
