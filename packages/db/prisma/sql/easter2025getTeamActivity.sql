SELECT
  uta."userId",
  COUNT(*) AS activity_count
FROM "userTextActivity" uta
INNER JOIN "Easter2025TeamMember" tm
  ON uta."userId" = tm."userId"
LEFT JOIN "Easter2025DisabledChannels" dc
  ON uta."channelId" = dc."channelId"
WHERE
  tm."teamId" = $1
  AND uta."timestamp" >= tm."joinedAt"
  AND dc."channelId" IS NULL
GROUP BY
  uta."userId"
ORDER BY
  activity_count;
