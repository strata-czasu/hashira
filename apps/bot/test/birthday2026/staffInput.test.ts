import { describe, expect, it } from "bun:test";

import {
  isValidTimeZone,
  parseBirthday2026Instant,
} from "../../src/events/birthday2026/staffInput";

describe("Birthday 2026 staff input", () => {
  it("recognizes IANA timezones", () => {
    expect(isValidTimeZone("Europe/Warsaw")).toBe(true);
    expect(isValidTimeZone("Europe/Pigsty")).toBe(false);
  });

  it("parses explicit ISO instants without using the host timezone", () => {
    expect(parseBirthday2026Instant("2026-08-01T20:00:00+02:00")?.toISOString()).toBe(
      "2026-08-01T18:00:00.000Z",
    );
    expect(parseBirthday2026Instant("2026-08-01T18:00:00Z")?.toISOString()).toBe(
      "2026-08-01T18:00:00.000Z",
    );
  });

  it("rejects dates without an explicit offset and invalid values", () => {
    expect(parseBirthday2026Instant("2026-08-01T20:00:00")).toBeNull();
    expect(parseBirthday2026Instant("not-a-date")).toBeNull();
  });
});
