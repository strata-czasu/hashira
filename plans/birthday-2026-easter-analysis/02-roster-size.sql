-- Low cost: does not read activity tables.
-- Returns anonymized Easter team roster sizes.

WITH configured_teams AS (
  SELECT
    ec.id AS config_id,
    t.id AS team_id,
    DENSE_RANK() OVER (ORDER BY ec.id, t.id) AS anonymous_team
  FROM "Easter2026Config" ec
  JOIN "Team" t
    ON t."guildId" = ec."guildId"
  JOIN "Easter2026TeamConfig" etc
    ON etc."teamId" = t.id
)
SELECT
  ct.anonymous_team,
  COUNT(DISTINCT tm."userId")::int AS roster_members
FROM configured_teams ct
LEFT JOIN "TeamMember" tm
  ON tm."teamId" = ct.team_id
GROUP BY ct.config_id, ct.team_id, ct.anonymous_team
ORDER BY ct.anonymous_team;

