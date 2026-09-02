ALTER TABLE "Birthday2026EncounterConfig"
ADD CONSTRAINT "Birthday2026EncounterConfig_channelId_nonempty_check"
CHECK (char_length(btrim("channelId")) > 0),
ADD CONSTRAINT "Birthday2026EncounterConfig_responseWindowSeconds_positive_check"
CHECK ("responseWindowSeconds" > 0),
ADD CONSTRAINT "Birthday2026EncounterConfig_spawnIntervalSeconds_positive_check"
CHECK ("spawnIntervalSeconds" > 0),
ADD CONSTRAINT "Birthday2026EncounterConfig_individualReward_positive_check"
CHECK ("individualReward" > 0),
ADD CONSTRAINT "Birthday2026EncounterConfig_winCap_positive_check"
CHECK ("winCap" > 0),
ADD CONSTRAINT "Birthday2026EncounterConfig_teamThreshold_positive_check"
CHECK ("teamThreshold" > 0),
ADD CONSTRAINT "Birthday2026EncounterConfig_teamReward_positive_check"
CHECK ("teamReward" > 0);

ALTER TABLE "Birthday2026Encounter"
ADD CONSTRAINT "Birthday2026Encounter_sourceKey_nonempty_check"
CHECK (char_length(btrim("sourceKey")) > 0),
ADD CONSTRAINT "Birthday2026Encounter_window_valid_check"
CHECK ("expiresAt" > "startsAt"),
ADD CONSTRAINT "Birthday2026Encounter_resolution_valid_check"
CHECK ("resolvedAt" IS NULL OR "resolvedAt" >= "startsAt"),
ADD CONSTRAINT "Birthday2026Encounter_cancellation_valid_check"
CHECK ("cancelledAt" IS NULL OR "cancelledAt" >= "startsAt");

ALTER TABLE "Birthday2026EncounterMessage"
ADD CONSTRAINT "Birthday2026EncounterMessage_channelId_nonempty_check"
CHECK (char_length(btrim("channelId")) > 0),
ADD CONSTRAINT "Birthday2026EncounterMessage_messageId_nonempty_check"
CHECK (char_length(btrim("messageId")) > 0);

ALTER TABLE "Birthday2026EncounterWinner"
ADD CONSTRAINT "Birthday2026EncounterWinner_reward_positive_check"
CHECK ("reward" > 0);

ALTER TABLE "Birthday2026TeamEncounterCompletion"
ADD CONSTRAINT "Birthday2026TeamEncounterCompletion_reward_positive_check"
CHECK ("reward" > 0);
