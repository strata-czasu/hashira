ALTER TABLE "Halloween2026TotApple"
ADD CONSTRAINT "Halloween2026TotApple_passes_nonnegative_check"
CHECK ("passes" >= 0),
ADD CONSTRAINT "Halloween2026TotApple_fuse_valid_check"
CHECK ("fuseEndsAt" > "receivedAt"),
ADD CONSTRAINT "Halloween2026TotApple_distinct_holders_check"
CHECK ("previousHolderId" IS NULL OR "previousHolderId" <> "holderId");
