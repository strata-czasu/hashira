-- @param {String} $2:guildId
-- @param {DateTime} $3:since
-- @param {DateTime} $4:to?
SELECT 
  vs."userId",
  COALESCE(SUM(vst."secondsSpent"), 0)::bigint as "totalSeconds"
FROM "VoiceSession" vs
LEFT JOIN "VoiceSessionTotal" vst ON vst."voiceSessionId" = vs.id
  AND vst."isMuted" = false
  AND vst."isDeafened" = false
  AND vst."isAlone" = false
WHERE vs."userId" = ANY($1)
  AND vs."guildId" = $2
  AND vs."joinedAt" >= $3
  AND ($4::timestamp IS NULL OR vs."joinedAt" <= $4)
GROUP BY vs."userId"
