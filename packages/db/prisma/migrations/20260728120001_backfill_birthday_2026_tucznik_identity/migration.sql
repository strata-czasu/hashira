INSERT INTO "Birthday2026TeamIdentity" (
    "teamConfigId",
    "configId",
    "tucznikUserId",
    "captainUserId"
)
SELECT
    "id",
    "configId",
    "captainUserId",
    "captainUserId"
FROM "Birthday2026TeamConfig"
WHERE "captainUserId" IS NOT NULL;
