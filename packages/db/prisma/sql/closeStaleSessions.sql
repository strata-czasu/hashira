-- prisma/sql/updateVoiceSessionLeftAtToLastEventOrJoinedAt.sql
UPDATE "VoiceSession" AS vs
SET "leftAt" = COALESCE(
  (
    SELECT MAX(vse."timestamp")
    FROM "VoiceSessionStateEvent" AS vse
    WHERE vse."voiceSessionId" = vs."id"
  ),
  vs."joinedAt"
)
WHERE vs."leftAt" IS NULL;
