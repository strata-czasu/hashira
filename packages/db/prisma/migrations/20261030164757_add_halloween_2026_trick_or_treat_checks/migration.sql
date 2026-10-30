ALTER TABLE "Halloween2026TotPlayer"
ADD CONSTRAINT "Halloween2026TotPlayer_candies_nonnegative_check"
CHECK ("candies" >= 0);

ALTER TABLE "Halloween2026TotInventory"
ADD CONSTRAINT "Halloween2026TotInventory_count_valid_check"
CHECK ("count" >= 0 AND "count" <= 3);

ALTER TABLE "Halloween2026TotKnock"
ADD CONSTRAINT "Halloween2026TotKnock_distinct_users_check"
CHECK ("knockerId" <> "hostId"),
ADD CONSTRAINT "Halloween2026TotKnock_window_valid_check"
CHECK ("expiresAt" > "createdAt"),
ADD CONSTRAINT "Halloween2026TotKnock_answer_valid_check"
CHECK (
  ("status" = 'answered') = ("answeredAt" IS NOT NULL AND "choice" IS NOT NULL AND "outcome" IS NOT NULL)
);

ALTER TABLE "Halloween2026TotDailyLimit"
ADD CONSTRAINT "Halloween2026TotDailyLimit_mutes_nonnegative_check"
CHECK ("mutes" >= 0);
