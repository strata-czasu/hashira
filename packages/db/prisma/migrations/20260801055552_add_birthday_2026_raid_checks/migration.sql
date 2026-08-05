ALTER TABLE "Birthday2026TeamWalletTransaction"
DROP CONSTRAINT "Birthday2026TeamWalletTransaction_source_shape_valid",
ADD CONSTRAINT "Birthday2026TeamWalletTransaction_source_shape_valid"
CHECK (
  (
    "source" = 'feed'
    AND "entryType" = 'credit'
    AND "personalTransactionId" IS NOT NULL
  )
  OR (
    "source" = 'digestion'
    AND "entryType" = 'debit'
    AND "personalTransactionId" IS NULL
  )
  OR (
    "source" = 'raid'
    AND "personalTransactionId" IS NULL
  )
);

ALTER TABLE "Birthday2026RaidConfig"
ADD CONSTRAINT "Birthday2026RaidConfig_chargesPerTeam_positive_check"
CHECK ("chargesPerTeam" > 0),
ADD CONSTRAINT "Birthday2026RaidConfig_maxSteal_positive_check"
CHECK ("maxSteal" > 0),
ADD CONSTRAINT "Birthday2026RaidConfig_protectedFloor_nonnegative_check"
CHECK ("protectedFloor" >= 0),
ADD CONSTRAINT "Birthday2026RaidConfig_cooldownSeconds_nonnegative_check"
CHECK ("cooldownSeconds" >= 0),
ADD CONSTRAINT "Birthday2026RaidConfig_graceSeconds_nonnegative_check"
CHECK ("graceSeconds" >= 0),
ADD CONSTRAINT "Birthday2026RaidConfig_perUserLossCap_positive_check"
CHECK ("perUserLossCap" > 0),
ADD CONSTRAINT "Birthday2026RaidConfig_repeatTargetCap_positive_check"
CHECK ("repeatTargetCap" > 0);

ALTER TABLE "Birthday2026RaidAttempt"
ADD CONSTRAINT "Birthday2026RaidAttempt_enemy_team_check"
CHECK ("attackerTeamConfigId" <> "targetTeamConfigId"),
ADD CONSTRAINT "Birthday2026RaidAttempt_sourceKey_nonempty_check"
CHECK (length("sourceKey") > 0);

ALTER TABLE "Birthday2026RaidTransfer"
ADD CONSTRAINT "Birthday2026RaidTransfer_amount_positive_check"
CHECK ("amount" > 0),
ADD CONSTRAINT "Birthday2026RaidTransfer_distinct_wallets_check"
CHECK ("sourceWalletId" <> "destinationWalletId");
