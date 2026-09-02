import { describe, expect, it } from "bun:test";

import type { Birthday2026Config } from "@hashira/db";

import {
  getBirthday2026EventDayIndex,
  getBirthday2026EventState,
  getBirthday2026RegistrationState,
} from "../../src/events/birthday2026/eventState";

const start = new Date("2026-08-01T18:00:00Z");
const end = new Date("2026-08-08T18:00:00Z");

const config: Birthday2026Config = {
  id: 1,
  guildId: "guild-id",
  enabled: true,
  eventStartAt: start,
  eventEndAt: end,
  timezone: "UTC",
  visible: true,
  createdAt: start,
  updatedAt: start,
};

describe("Birthday 2026 event state", () => {
  it("distinguishes missing, hidden, disabled, and scheduled events", () => {
    expect(getBirthday2026EventState(null, start)).toBe("not_configured");
    expect(getBirthday2026EventState({ ...config, visible: false }, start)).toBe("hidden");
    expect(getBirthday2026EventState({ ...config, enabled: false }, start)).toBe("disabled");
    expect(getBirthday2026EventState(config, new Date(start.getTime() - 1))).toBe("not_started");
  });

  it("uses an inclusive start and exclusive end", () => {
    expect(getBirthday2026EventState(config, start)).toBe("open");
    expect(getBirthday2026EventState(config, new Date(end.getTime() - 1))).toBe("open");
    expect(getBirthday2026EventState(config, end)).toBe("finished");
  });

  it("keeps public registration open through the event", () => {
    expect(getBirthday2026RegistrationState(config, new Date(start.getTime() - 1))).toBe("open");
    expect(getBirthday2026RegistrationState(config, start)).toBe("open");
    expect(getBirthday2026RegistrationState(config, new Date(end.getTime() - 1))).toBe("open");
    expect(getBirthday2026RegistrationState(config, end)).toBe("closed");
  });

  it("calculates seven event days from the 20:00-anchored event window", () => {
    expect(getBirthday2026EventDayIndex(config, start)).toBe(0);
    expect(getBirthday2026EventDayIndex(config, new Date(start.getTime() + 86_400_000))).toBe(1);
    expect(getBirthday2026EventDayIndex(config, new Date(end.getTime() - 1))).toBe(6);
    expect(getBirthday2026EventDayIndex(config, end)).toBeNull();
  });
});
