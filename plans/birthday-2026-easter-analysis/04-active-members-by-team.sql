-- High cost: scans eligible Easter text activity once.
-- Returns anonymized roster and active-member counts.

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
    tm."joinedAt" AS joined_at,
    t.id AS team_id,
    DENSE_RANK() OVER (ORDER BY cfg.config_id, t.id) AS anonymous_team
  FROM cfg
  JOIN "Team" t
    ON t."guildId" = cfg.guild_id
  JOIN "Easter2026TeamConfig" etc
    ON etc."teamId" = t.id
  JOIN "TeamMember" tm
    ON tm."teamId" = t.id
),
active_members AS (
  SELECT DISTINCT
    m.config_id,
    m.team_id,
    m.user_id
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
  m.anonymous_team,
  COUNT(DISTINCT m.user_id)::int AS roster_members,
  COUNT(DISTINCT a.user_id)::int AS active_members
FROM members m
LEFT JOIN active_members a
  ON a.config_id = m.config_id
 AND a.team_id = m.team_id
 AND a.user_id = m.user_id
GROUP BY m.config_id, m.team_id, m.anonymous_team
ORDER BY m.anonymous_team;

