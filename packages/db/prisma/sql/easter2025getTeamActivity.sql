SELECT COALESCE(COUNT(*), 0) AS total_activity_count
FROM "userTextActivity" uta
INNER JOIN "Easter2025TeamMember" tm
  ON uta."userId" = tm."userId"
WHERE tm."teamId" = $1
  AND uta."timestamp" >= tm."joinedAt";
