-- High cost: scans eligible Easter text activity once.
-- Matches Easter's UTC-date scoring buckets and configured bonus channels.

WITH cfg AS (
  SELECT
    ec.id AS config_id,
    ec."guildId" AS guild_id,
    ec."eventStartDate" AS event_start,
    ec."eventEndDate" AS event_end,
    ec."dailyMessageCap" AS daily_cap
  FROM "Easter2026Config" ec
),
members AS (
  SELECT
    cfg.*,
    tm."userId" AS user_id,
    tm."joinedAt" AS joined_at,
    t.id AS team_id
  FROM cfg
  JOIN "Team" t
    ON t."guildId" = cfg.guild_id
  JOIN "Easter2026TeamConfig" etc
    ON etc."teamId" = t.id
  JOIN "TeamMember" tm
    ON tm."teamId" = t.id
),
daily_scores AS (
  SELECT
    m.config_id,
    m.user_id,
    uta."timestamp"::date AS scoring_day,
    LEAST(
      SUM(COALESCE(bc.multiplier, 1.0)),
      MAX(m.daily_cap)
    ) AS daily_score
  FROM members m
  JOIN "userTextActivity" uta
    ON uta."guildId" = m.guild_id
   AND uta."userId" = m.user_id
   AND uta."timestamp" >= GREATEST(m.event_start, m.joined_at)
   AND uta."timestamp" <= m.event_end
  LEFT JOIN "Easter2026BonusChannel" bc
    ON bc."configId" = m.config_id
   AND bc."channelId" = uta."channelId"
   AND bc.date = uta."timestamp"::date
  WHERE NOT EXISTS (
    SELECT 1
    FROM "Easter2026DisabledChannel" dc
    WHERE dc."configId" = m.config_id
      AND dc."channelId" = uta."channelId"
  )
  GROUP BY m.config_id, m.user_id, scoring_day
),
user_scores AS (
  SELECT
    config_id,
    user_id,
    SUM(daily_score) AS total_score
  FROM daily_scores
  GROUP BY config_id, user_id
)
SELECT
  COUNT(*)::int AS participating_members,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_score)::numeric, 2) AS median,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_score)::numeric, 2) AS p75,
  ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY total_score)::numeric, 2) AS p90,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_score)::numeric, 2) AS p95,
  ROUND(MAX(total_score)::numeric, 2) AS top_score
FROM user_scores;

