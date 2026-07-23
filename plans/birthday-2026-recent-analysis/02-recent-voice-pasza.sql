-- Recent server-wide eligible voice activity.
-- One row per pseudonymous participant and complete seven-day block.
-- Proposed Birthday rule: 1 Pasza per 10 eligible minutes, max 18/event day.
-- A session is assigned to the event day in which it starts.

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
  SELECT ec."guildId" AS guild_id
  FROM "Easter2026Config" ec
  ORDER BY ec."eventEndDate" DESC
  LIMIT 1
),
eligible_sessions AS (
  SELECT
    MD5(vs."userId") AS participant_key,
    FLOOR(
      EXTRACT(EPOCH FROM (vs."joinedAt" - b.analysis_start)) / 604800
    )::int AS week_index,
    FLOOR(
      EXTRACT(EPOCH FROM (vs."joinedAt" - b.analysis_start)) / 86400
    )::int AS event_day,
    SUM(vst."secondsSpent")::bigint AS eligible_seconds
  FROM cfg
  CROSS JOIN bounds b
  JOIN "VoiceSession" vs
    ON vs."guildId" = cfg.guild_id
   AND vs."joinedAt" >= b.analysis_start
   AND vs."joinedAt" < b.analysis_end
  JOIN "VoiceSessionTotal" vst
    ON vst."voiceSessionId" = vs.id
   AND vst."isMuted" = false
   AND vst."isDeafened" = false
   AND vst."isAlone" = false
  GROUP BY vs.id, participant_key, week_index, event_day
),
daily_voice AS (
  SELECT
    participant_key,
    week_index,
    event_day,
    SUM(eligible_seconds)::bigint AS eligible_seconds,
    LEAST(
      FLOOR(SUM(eligible_seconds) / 600),
      18
    )::int AS voice_pasza
  FROM eligible_sessions
  GROUP BY participant_key, week_index, event_day
),
weekly_voice AS (
  SELECT
    participant_key,
    week_index,
    ROUND(SUM(eligible_seconds)::numeric / 60, 2) AS eligible_minutes,
    SUM(voice_pasza)::int AS voice_pasza
  FROM daily_voice
  GROUP BY participant_key, week_index
)
SELECT
  b.analysis_start,
  b.analysis_end,
  wv.participant_key,
  wv.week_index,
  wv.eligible_minutes,
  wv.voice_pasza
FROM weekly_voice wv
CROSS JOIN bounds b
ORDER BY wv.week_index, wv.participant_key;

