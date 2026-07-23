import { describe, expect, it } from "bun:test";
import {
  isValidTimeZone,
  validateBirthday2026Config,
} from "../../src/events/birthday2026/configService";

const validInput = {
  guildId: "guild",
  eventStartAt: new Date("2026-08-01T18:00:00Z"),
  eventEndAt: new Date("2026-08-08T18:00:00Z"),
  timezone: "Europe/Warsaw",
  visible: false,
  enabled: false,
  registrationEnabled: false,
};

describe("Birthday 2026 configuration validation", () => {
  it("accepts the adopted event window and timezone", () => {
    expect(validateBirthday2026Config(validInput)).toBeNull();
    expect(isValidTimeZone("Europe/Warsaw")).toBe(true);
  });

  it("rejects an invalid or empty timezone", () => {
    for (const timezone of ["", "   ", "Europe/Pigsty"]) {
      expect(validateBirthday2026Config({ ...validInput, timezone })).toBe(
        "invalid_timezone",
      );
    }
  });

  it("rejects reversed, equal, or invalid event windows", () => {
    const invalidWindows = [
      [validInput.eventEndAt, validInput.eventStartAt],
      [validInput.eventStartAt, validInput.eventStartAt],
      [new Date(Number.NaN), validInput.eventEndAt],
    ] as const;

    for (const [eventStartAt, eventEndAt] of invalidWindows) {
      expect(
        validateBirthday2026Config({
          ...validInput,
          eventStartAt,
          eventEndAt,
        }),
      ).toBe("invalid_event_window");
    }
  });
});
