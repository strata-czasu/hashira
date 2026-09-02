-- Manual migration based on 20260728130000_add_birthday_2026_text_earning.

ALTER TABLE "Birthday2026TextEarningConfig"
  ADD CONSTRAINT "Birthday2026TextEarningConfig_window_seconds_valid"
  CHECK ("windowSeconds" > 0),
  ADD CONSTRAINT "Birthday2026TextEarningConfig_daily_cap_valid"
  CHECK ("dailyCap" > 0);

ALTER TABLE "Birthday2026DailyTextEarning"
  ADD CONSTRAINT "Birthday2026DailyTextEarning_event_day_valid"
  CHECK ("eventDayIndex" >= 0),
  ADD CONSTRAINT "Birthday2026DailyTextEarning_awarded_windows_valid"
  CHECK ("awardedWindows" >= 0);
