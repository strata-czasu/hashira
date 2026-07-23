-- Recent server-wide text activity.
-- One row per pseudonymous participant and complete seven-day block.
-- Proposed Birthday rule: 1 Pasza per fixed five-minute window, max 24/event day.

WITH clock AS (
  SELECT CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Warsaw' AS local_now
),
local_bounds AS (
  SELECT
    CASE
      WHEN local_now::time >= TIME '20:00'
        THEN local_now::date + TIME '20:00'
      ELSE (local_now::date - 1) + TIME '20:00'
    END AS local_end
  FROM clock
),
bounds AS (
  SELECT
    (
      (local_end AT TIME ZONE 'Europe/Warsaw') AT TIME ZONE 'UTC'
    )::timestamp - INTERVAL '28 days' AS analysis_start,
    (
      (local_end AT TIME ZONE 'Europe/Warsaw') AT TIME ZONE 'UTC'
    )::timestamp AS analysis_end
  FROM local_bounds
),
cfg AS (
  SELECT
    ec.id AS config_id,
    ec."guildId" AS guild_id
  FROM "Easter2026Config" ec
  ORDER BY ec."eventEndDate" DESC
  LIMIT 1
),
daily_text AS (
  SELECT
    MD5(uta."userId") AS participant_key,
    FLOOR(
      EXTRACT(EPOCH FROM (uta."timestamp" - b.analysis_start)) / 604800
    )::int AS week_index,
    FLOOR(
      EXTRACT(EPOCH FROM (uta."timestamp" - b.analysis_start)) / 86400
    )::int AS event_day,
    COUNT(*)::int AS qualifying_messages,
    LEAST(
      COUNT(
        DISTINCT FLOOR(
          EXTRACT(EPOCH FROM uta."timestamp" AT TIME ZONE 'UTC') / 300
        )
      ),
      24
    )::int AS text_pasza
  FROM cfg
  CROSS JOIN bounds b
  JOIN "userTextActivity" uta
    ON uta."guildId" = cfg.guild_id
   AND uta."timestamp" >= b.analysis_start
   AND uta."timestamp" < b.analysis_end
  WHERE NOT EXISTS (
    SELECT 1
    FROM "Easter2026DisabledChannel" dc
    WHERE dc."configId" = cfg.config_id
      AND dc."channelId" = uta."channelId"
  )
  GROUP BY participant_key, week_index, event_day
),
weekly_text AS (
  SELECT
    participant_key,
    week_index,
    SUM(qualifying_messages)::int AS qualifying_messages,
    SUM(text_pasza)::int AS text_pasza
  FROM daily_text
  GROUP BY participant_key, week_index
)
SELECT
  b.analysis_start,
  b.analysis_end,
  wt.participant_key,
  wt.week_index,
  wt.qualifying_messages,
  wt.text_pasza
FROM weekly_text wt
CROSS JOIN bounds b
ORDER BY wt.week_index, wt.participant_key;

