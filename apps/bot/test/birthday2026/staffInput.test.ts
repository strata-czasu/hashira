import { describe, expect, it } from "bun:test";
import {
  parseBirthday2026Instant,
  parseBirthday2026TeamColor,
} from "../../src/events/birthday2026/staffInput";

describe("Birthday 2026 staff input", () => {
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

  it("accepts exactly six hex color digits, including black", () => {
    expect(parseBirthday2026TeamColor("#ff8800")).toBe(0xff8800);
    expect(parseBirthday2026TeamColor("000000")).toBe(0);
    expect(parseBirthday2026TeamColor("#fff")).toBeNull();
    expect(parseBirthday2026TeamColor("#ff880000")).toBeNull();
  });
});
