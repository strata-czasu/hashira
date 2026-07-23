-- High cost: scans eligible Easter text activity once.
-- Converts the UTC-semantic timestamp column to Europe/Warsaw explicitly.

WITH cfg AS (
  SELECT
    ec.id AS config_id,
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
hourly_activity AS (
  SELECT
    m.user_id,
    EXTRACT(
      HOUR FROM (
        uta."timestamp" AT TIME ZONE 'UTC'
      ) AT TIME ZONE 'Europe/Warsaw'
    )::int AS local_hour
  FROM members m
  JOIN "userTextActivity" uta
    ON uta."guildId" = m.guild_id
   AND uta."userId" = m.user_id
   AND uta."timestamp" >= GREATEST(m.event_start, m.joined_at)
   AND uta."timestamp" <= m.event_end
  WHERE NOT EXISTS (
    SELECT 1
    FROM "Easter2026DisabledChannel" dc
    WHERE dc."configId" = m.config_id
      AND dc."channelId" = uta."channelId"
  )
)
SELECT
  local_hour,
  COUNT(*)::int AS messages,
  COUNT(DISTINCT user_id)::int AS active_members,
  ROUND(
    100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0),
    2
  ) AS percent_of_messages
FROM hourly_activity
GROUP BY local_hour
ORDER BY local_hour;

