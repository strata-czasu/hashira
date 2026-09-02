ALTER TABLE "Birthday2026Milestone"
ADD CONSTRAINT "Birthday2026Milestone_position_nonnegative_check"
CHECK ("position" >= 0),
ADD CONSTRAINT "Birthday2026Milestone_threshold_nonnegative_check"
CHECK ("threshold" >= 0),
ADD CONSTRAINT "Birthday2026Milestone_name_nonempty_check"
CHECK (char_length(btrim("name")) > 0);

ALTER TABLE "Birthday2026TeamPersona"
ADD CONSTRAINT "Birthday2026TeamPersona_title_nonempty_check"
CHECK (char_length(btrim("title")) > 0),
ADD CONSTRAINT "Birthday2026TeamPersona_fallbackEmoji_nonempty_check"
CHECK (char_length(btrim("fallbackEmoji")) > 0);

ALTER TABLE "Birthday2026TeamArtwork"
ADD CONSTRAINT "Birthday2026TeamArtwork_imageUrl_nonempty_check"
CHECK (char_length(btrim("imageUrl")) > 0);

ALTER TABLE "Birthday2026StatusMessage"
ADD CONSTRAINT "Birthday2026StatusMessage_channelId_nonempty_check"
CHECK (char_length(btrim("channelId")) > 0),
ADD CONSTRAINT "Birthday2026StatusMessage_messageId_nonempty_check"
CHECK (char_length(btrim("messageId")) > 0);
