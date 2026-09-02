-- Manual migration based on 20260723233441_add_birthday_2026_pasza_path.

ALTER TABLE "Birthday2026EconomyConfig"
  ADD CONSTRAINT "Birthday2026EconomyConfig_digestion_delay_valid"
  CHECK ("digestionDelaySeconds" >= 0);

ALTER TABLE "Birthday2026TeamWallet"
  ADD CONSTRAINT "Birthday2026TeamWallet_balance_valid"
  CHECK ("balance" >= 0),
  ADD CONSTRAINT "Birthday2026TeamWallet_permanent_weight_valid"
  CHECK ("permanentWeight" >= 0);

ALTER TABLE "Birthday2026TeamWalletTransaction"
  ADD CONSTRAINT "Birthday2026TeamWalletTransaction_amount_valid"
  CHECK ("amount" > 0),
  ADD CONSTRAINT "Birthday2026TeamWalletTransaction_source_key_nonempty"
  CHECK (length(trim("sourceKey")) > 0),
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
  );

ALTER TABLE "Birthday2026FeedBatch"
  ADD CONSTRAINT "Birthday2026FeedBatch_amount_valid"
  CHECK ("amount" > 0),
  ADD CONSTRAINT "Birthday2026FeedBatch_remaining_amount_valid"
  CHECK ("remainingAmount" BETWEEN 0 AND "amount"),
  ADD CONSTRAINT "Birthday2026FeedBatch_digested_state_valid"
  CHECK ("digestedAt" IS NULL OR "remainingAmount" = 0),
  ADD CONSTRAINT "Birthday2026FeedBatch_source_key_nonempty"
  CHECK (length(trim("sourceKey")) > 0);

ALTER TABLE "Birthday2026PersonalTransaction"
  ADD CONSTRAINT "Birthday2026PersonalTransaction_source_key_nonempty"
  CHECK (length(trim("sourceKey")) > 0),
  ADD CONSTRAINT "Birthday2026PersonalTransaction_creator_valid"
  CHECK (
    ("source" = 'staffGrant' AND "createdByUserId" IS NOT NULL)
    OR ("source" <> 'staffGrant' AND "createdByUserId" IS NULL)
  );
