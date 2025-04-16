SELECT uta."userId", COALESCE(COUNT(*), 0) AS activity_count
FROM "userTextActivity" uta
INNER JOIN "Easter2025TeamMember" tm 
  ON uta."userId" = tm."userId"
WHERE tm."teamId" = $1
  AND uta."timestamp" >= tm."joinedAt"
GROUP BY uta."userId"
ORDER BY activity_count

