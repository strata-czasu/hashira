-- Manual migration based off 20260731221205_add_birthday_2026_voice_earning.

ALTER TABLE "Birthday2026VoiceEarningConfig"
  ADD CONSTRAINT "Birthday2026VoiceEarningConfig_unit_seconds_valid"
  CHECK ("unitSeconds" > 0),
  ADD CONSTRAINT "Birthday2026VoiceEarningConfig_daily_cap_valid"
  CHECK ("dailyCap" > 0);

ALTER TABLE "Birthday2026DailyVoiceEarning"
  ADD CONSTRAINT "Birthday2026DailyVoiceEarning_event_day_valid"
  CHECK ("eventDayIndex" >= 0),
  ADD CONSTRAINT "Birthday2026DailyVoiceEarning_awarded_units_valid"
  CHECK ("awardedUnits" >= 0);
