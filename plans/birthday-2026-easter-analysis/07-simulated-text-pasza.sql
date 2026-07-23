-- Very high cost: counts distinct five-minute activity windows.
-- Proposed Birthday rule: max 24 rewarded text windows per 24-hour event day.
-- Uses the first seven configured event days. If the event is shorter, the
-- result is normalized to seven days.
-- Run this separately and only after the basic Easter reports succeed.

WITH cfg AS (
  SELECT
    ec.id AS config_id,
    ec."guildId" AS guild_id,
    ec."eventStartDate" AS event_start,
    LEAST(
      ec."eventEndDate",
      ec."eventStartDate" + INTERVAL '7 days'
    ) AS event_end,
    GREATEST(
      EXTRACT(
        EPOCH FROM (
          LEAST(
            ec."eventEndDate",
            ec."eventStartDate" + INTERVAL '7 days'
          ) - ec."eventStartDate"
        )
      ) / 86400.0,
      1.0
    ) AS event_days
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
daily_text AS (
  SELECT
    m.config_id,
    m.user_id,
    m.event_days,
    FLOOR(
      EXTRACT(EPOCH FROM (uta."timestamp" - m.event_start)) / 86400
    )::int AS event_day,
    LEAST(
      COUNT(
        DISTINCT FLOOR(
          EXTRACT(EPOCH FROM uta."timestamp" AT TIME ZONE 'UTC') / 300
        )
      ),
      24
    )::int AS text_pasza
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
  GROUP BY m.config_id, m.user_id, m.event_days, event_day
),
event_text AS (
  SELECT
    config_id,
    user_id,
    MAX(event_days) AS event_days,
    SUM(text_pasza) AS event_text_pasza
  FROM daily_text
  GROUP BY config_id, user_id
),
normalized_text AS (
  SELECT
    config_id,
    user_id,
    event_text_pasza * 7.0 / event_days AS seven_day_text_pasza
  FROM event_text
)
SELECT
  COUNT(*)::int AS participating_members,
  ROUND(
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY seven_day_text_pasza)::numeric,
    2
  ) AS median,
  ROUND(
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY seven_day_text_pasza)::numeric,
    2
  ) AS p75,
  ROUND(
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY seven_day_text_pasza)::numeric,
    2
  ) AS p90,
  ROUND(
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY seven_day_text_pasza)::numeric,
    2
  ) AS p95,
  ROUND(MAX(seven_day_text_pasza)::numeric, 2) AS top_seven_days
FROM normalized_text;
