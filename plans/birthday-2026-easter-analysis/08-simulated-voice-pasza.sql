-- Medium/high cost.
-- Proposed Birthday rule: 1 Pasza per 10 eligible minutes, max 18/day.
-- Sessions are assigned to the 24-hour event day in which they start.
-- Uses the first seven configured event days. If the event is shorter, the
-- result is normalized to seven days.

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
daily_voice AS (
  SELECT
    m.config_id,
    m.user_id,
    m.event_days,
    FLOOR(
      EXTRACT(EPOCH FROM (vs."joinedAt" - m.event_start)) / 86400
    )::int AS event_day,
    LEAST(
      FLOOR(SUM(vst."secondsSpent") / 600),
      18
    )::int AS voice_pasza
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
  GROUP BY m.config_id, m.user_id, m.event_days, event_day
),
event_voice AS (
  SELECT
    config_id,
    user_id,
    MAX(event_days) AS event_days,
    SUM(voice_pasza) AS event_voice_pasza
  FROM daily_voice
  GROUP BY config_id, user_id
),
normalized_voice AS (
  SELECT
    config_id,
    user_id,
    event_voice_pasza * 7.0 / event_days AS seven_day_voice_pasza
  FROM event_voice
)
SELECT
  COUNT(*)::int AS participating_members,
  ROUND(
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY seven_day_voice_pasza)::numeric,
    2
  ) AS median,
  ROUND(
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY seven_day_voice_pasza)::numeric,
    2
  ) AS p75,
  ROUND(
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY seven_day_voice_pasza)::numeric,
    2
  ) AS p90,
  ROUND(
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY seven_day_voice_pasza)::numeric,
    2
  ) AS p95,
  ROUND(MAX(seven_day_voice_pasza)::numeric, 2) AS top_seven_days
FROM normalized_voice;
