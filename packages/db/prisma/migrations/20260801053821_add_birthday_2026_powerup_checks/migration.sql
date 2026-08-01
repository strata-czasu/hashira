ALTER TABLE "Birthday2026PowerupConfig"
ADD CONSTRAINT "Birthday2026PowerupConfig_maxInventory_positive_check"
CHECK ("maxInventory" > 0),
ADD CONSTRAINT "Birthday2026PowerupConfig_effectDurationSeconds_positive_check"
CHECK ("effectDurationSeconds" > 0),
ADD CONSTRAINT "Birthday2026PowerupConfig_turboDigestionSeconds_nonnegative_check"
CHECK ("turboDigestionSeconds" >= 0);

ALTER TABLE "Birthday2026TeamPowerupState"
ADD CONSTRAINT "Birthday2026TeamPowerupState_inventory_nonnegative_check"
CHECK ("inventory" >= 0);

ALTER TABLE "Birthday2026PowerupActivation"
ADD CONSTRAINT "Birthday2026PowerupActivation_window_valid_check"
CHECK ("expiresAt" > "activatedAt");
