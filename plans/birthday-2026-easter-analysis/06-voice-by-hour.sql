-- Medium/high cost: scans eligible voice sessions and totals once.
-- Long sessions are attributed to their start hour.

WITH cfg AS (
  SELECT
    ec."guildId" AS guild_id,
    ec."eventStartDate" AS event_start,
    ec."eventEndDate" AS event_end
  FROM "Easter2026Config" ec
),
members AS (
  SELECT
    cfg.*,
    tm."userId" AS user_id,
    tm."joinedAt" AS joined_at
  FROM cfg
  JOIN "Team" t
    ON t."guildId" = cfg.guild_id
  JOIN "Easter2026TeamConfig" etc
    ON etc."teamId" = t.id
  JOIN "TeamMember" tm
    ON tm."teamId" = t.id
),
eligible_sessions AS (
  SELECT
    m.user_id,
    EXTRACT(
      HOUR FROM (
        vs."joinedAt" AT TIME ZONE 'UTC'
      ) AT TIME ZONE 'Europe/Warsaw'
    )::int AS local_hour,
    SUM(vst."secondsSpent") AS eligible_seconds
  FROM members m
  JOIN "VoiceSession" vs
    ON vs."guildId" = m.guild_id
   AND vs."userId" = m.user_id
   AND vs."joinedAt" >= GREATEST(m.event_start, m.joined_at)
   AND vs."joinedAt" <= m.event_end
  JOIN "VoiceSessionTotal" vst
    ON vst."voiceSessionId" = vs.id
   AND vst."isMuted" = false
   AND vst."isDeafened" = false
   AND vst."isAlone" = false
  GROUP BY vs.id, m.user_id, local_hour
)
SELECT
  local_hour,
  COUNT(DISTINCT user_id)::int AS active_members,
  ROUND(SUM(eligible_seconds)::numeric / 3600, 2) AS eligible_hours,
  ROUND(
    100.0 * SUM(eligible_seconds)
      / NULLIF(SUM(SUM(eligible_seconds)) OVER (), 0),
    2
  ) AS percent_of_voice
FROM eligible_sessions
GROUP BY local_hour
ORDER BY local_hour;

