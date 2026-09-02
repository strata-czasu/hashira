-- Manual migration based on 20260723211420_add_birthday_2026_event_shell.

ALTER TABLE "Birthday2026Config"
  ADD CONSTRAINT "Birthday2026Config_event_window_valid"
  CHECK ("eventEndAt" > "eventStartAt"),
  ADD CONSTRAINT "Birthday2026Config_timezone_nonempty"
  CHECK (length(trim("timezone")) > 0);

ALTER TABLE "Birthday2026TeamConfig"
  ADD CONSTRAINT "Birthday2026TeamConfig_color_valid"
  CHECK ("color" BETWEEN 0 AND 16777215);
