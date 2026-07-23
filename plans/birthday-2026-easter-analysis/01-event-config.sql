-- Very low cost.
-- Confirms which configured Easter window is available.

SELECT
  COUNT(*)::int AS configured_guilds,
  MIN("eventStartDate") AS earliest_start,
  MAX("eventEndDate") AS latest_end,
  MIN("dailyMessageCap")::int AS minimum_daily_cap,
  MAX("dailyMessageCap")::int AS maximum_daily_cap
FROM "Easter2026Config";

