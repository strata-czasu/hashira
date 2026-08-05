ALTER TABLE "Birthday2026Settlement"
ADD CONSTRAINT "Birthday2026Settlement_cutoff_before_settled_check"
CHECK ("cutoffAt" <= "settledAt"),
ADD CONSTRAINT "Birthday2026Settlement_digestedPendingPasza_nonnegative_check"
CHECK ("digestedPendingPasza" >= 0),
ADD CONSTRAINT "Birthday2026Settlement_discardedPersonalPasza_nonnegative_check"
CHECK ("discardedPersonalPasza" >= 0);

ALTER TABLE "Birthday2026SettlementTeam"
ADD CONSTRAINT "Birthday2026SettlementTeam_rank_positive_check"
CHECK ("rank" > 0),
ADD CONSTRAINT "Birthday2026SettlementTeam_permanentWeight_nonnegative_check"
CHECK ("permanentWeight" >= 0),
ADD CONSTRAINT "Birthday2026SettlementTeam_contributedPasza_nonnegative_check"
CHECK ("contributedPasza" >= 0),
ADD CONSTRAINT "Birthday2026SettlementTeam_contributorCount_nonnegative_check"
CHECK ("contributorCount" >= 0);

ALTER TABLE "Birthday2026IndividualResult"
ADD CONSTRAINT "Birthday2026IndividualResult_amount_positive_check"
CHECK ("amount" > 0);
