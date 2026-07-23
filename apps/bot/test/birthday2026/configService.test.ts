import { describe, expect, it } from "bun:test";
import {
  Birthday2026ConfigValidationError,
  isValidTimeZone,
  validateBirthday2026Config,
} from "../../src/events/birthday2026/configService";

const validInput = {
  guildId: "guild",
  eventStartAt: new Date("2026-08-01T18:00:00Z"),
  eventEndAt: new Date("2026-08-08T18:00:00Z"),
  timezone: "Europe/Warsaw",
};

describe("Birthday 2026 configuration validation", () => {
  it("accepts the adopted event window and timezone", () => {
    expect(() => validateBirthday2026Config(validInput)).not.toThrow();
    expect(isValidTimeZone("Europe/Warsaw")).toBe(true);
  });

  it("rejects an invalid or empty timezone", () => {
    for (const timezone of ["", "   ", "Europe/Pigsty"]) {
      expect(() => validateBirthday2026Config({ ...validInput, timezone })).toThrow(
        Birthday2026ConfigValidationError,
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
      expect(() =>
        validateBirthday2026Config({
          ...validInput,
          eventStartAt,
          eventEndAt,
        }),
      ).toThrow(Birthday2026ConfigValidationError);
    }
  });
});
